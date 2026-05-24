// api/register.js — Vercel Serverless Function
// Saves full registration data to Vercel Postgres AND increments counter in KV.
// POST /api/register → { ok: true, memberId, serial, count }

import { sql } from '@vercel/postgres';
import { kv } from '@vercel/kv';

const KV_KEY = 'cap_reg_count_v2';
const BASELINE = 0;

// Ensure the registrations table exists (runs only on cold start if table is missing)
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS registrations (
      id          SERIAL PRIMARY KEY,
      member_id   TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      age         INTEGER NOT NULL,
      gender      TEXT NOT NULL,
      email       TEXT NOT NULL,
      phone       TEXT NOT NULL,
      city        TEXT NOT NULL,
      interests   TEXT,
      skill       TEXT,
      ip_hash     TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `;
}

// Simple hash of IP to avoid storing raw IPs (privacy)
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

// Generate unique CAP member ID
function generateMemberID() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `CAP-PK-${rand}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};

    // --- Basic server-side validation ---
    const name     = (body.name     || '').trim();
    const age      = parseInt(body.age, 10);
    const gender   = (body.gender   || '').trim();
    const email    = (body.email    || '').trim().toLowerCase();
    const phone    = (body.phone    || '').trim();
    const city     = (body.city     || '').trim();
    const interests = Array.isArray(body.interests)
      ? body.interests.join(', ')
      : (body.interests || '').trim();
    const skill    = (body.skill    || '').trim();

    if (!name || name.length < 3)         return res.status(400).json({ error: 'Invalid name' });
    if (isNaN(age) || age < 18 || age > 40) return res.status(400).json({ error: 'Age must be 18-40' });
    if (!gender)                           return res.status(400).json({ error: 'Gender required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
    if (!phone)                            return res.status(400).json({ error: 'Phone required' });
    if (!city)                             return res.status(400).json({ error: 'City required' });

    const memberId = generateMemberID();
    const ipRaw    = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const ipHash   = hashString(ipRaw.split(',')[0].trim());

    // --- Ensure table exists ---
    await ensureTable();

    // --- Duplicate email check ---
    const existing = await sql`SELECT id FROM registrations WHERE email = ${email} LIMIT 1`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This email is already registered with CAP.' });
    }

    // --- Insert registration into Postgres and get serial ID ---
    const insertRes = await sql`
      INSERT INTO registrations (member_id, name, age, gender, email, phone, city, interests, skill, ip_hash)
      VALUES (${memberId}, ${name}, ${age}, ${gender}, ${email}, ${phone}, ${city}, ${interests}, ${skill}, ${ipHash})
      RETURNING id
    `;
    const insertedSerial = parseInt(insertRes.rows[0].id, 10);

    // --- Atomically increment counter in KV ---
    let newCount = insertedSerial;
    try {
      let current = await kv.get(KV_KEY);
      if (current === null || current === undefined) await kv.set(KV_KEY, BASELINE);
      newCount = await kv.incr(KV_KEY);
    } catch (kvErr) {
      console.warn('[CAP KV Register Error] KV increment failed, falling back to database serial ID:', kvErr.message);
      newCount = insertedSerial;
    }

    // --- Also relay to Formspree for email notifications (fire-and-forget) ---
    const formspreeUrl = 'https://formspree.io/f/mzdwveln';
    const formspreePayload = new URLSearchParams({
      name, age: String(age), gender, email, phone, city, interests, skill,
      member_id: memberId,
      _subject: `New CAP Registration #${newCount} — ${name} from ${city}`
    });
    // Non-blocking — don't await, don't let failure affect response
    fetch(formspreeUrl, {
      method: 'POST',
      body: formspreePayload,
      headers: { Accept: 'application/json' }
    }).catch(() => {}); // Swallow errors silently

    return res.status(200).json({
      ok: true,
      memberId,
      serial: newCount,
      count: Number(newCount)
    });

  } catch (err) {
    console.error('[CAP Register API Error]', err);
    // Return a safe message — never expose raw DB errors to the client
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}
