// api/count.js — Vercel Serverless Function
// Backed by Vercel KV (managed Redis) with Vercel Postgres fallback.
// GET  /api/count  → returns { count: <number> }
// POST /api/count  → increments by 1, returns { count: <number> }

import { kv } from '@vercel/kv';
import { sql } from '@vercel/postgres';

const KEY = 'cap_reg_count_v2';
const BASELINE = 0; // Starting count if key doesn't exist yet

export default async function handler(req, res) {
  // Never cache the counter — always serve the live value
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      // --- READ: Return current registration count ---
      let count;
      try {
        count = await kv.get(KEY);
        if (count === null || count === undefined) {
          await kv.set(KEY, BASELINE);
          count = BASELINE;
        }
      } catch (kvErr) {
        console.warn('[CAP Counter KV Fallback] KV failed, reading Postgres:', kvErr.message);
        // Fallback to Vercel Postgres
        const pgRes = await sql`SELECT COUNT(*) as count FROM registrations`;
        count = parseInt(pgRes.rows[0].count, 10) || 0;
      }

      return res.status(200).json({ count: Number(count) });

    } else if (req.method === 'POST') {
      // --- WRITE: Atomically increment count by 1 ---
      let newCount;
      try {
        let current = await kv.get(KEY);
        if (current === null || current === undefined) {
          await kv.set(KEY, BASELINE);
        }
        newCount = await kv.incr(KEY);
      } catch (kvErr) {
        console.warn('[CAP Counter KV POST Fallback] KV failed, reading Postgres:', kvErr.message);
        const pgRes = await sql`SELECT COUNT(*) as count FROM registrations`;
        newCount = parseInt(pgRes.rows[0].count, 10) || 0;
      }

      return res.status(200).json({ count: Number(newCount) });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('[CAP Counter API Error]', err);
    try {
      const pgRes = await sql`SELECT COUNT(*) as count FROM registrations`;
      const count = parseInt(pgRes.rows[0].count, 10) || 0;
      return res.status(200).json({ count });
    } catch (pgErr) {
      console.error('[CAP Counter Postgres Fallback Error]', pgErr);
      return res.status(200).json({ count: BASELINE, error: 'DB unavailable' });
    }
  }
}
