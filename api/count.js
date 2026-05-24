// api/count.js — Vercel Serverless Function
// Backed by Vercel KV (managed Redis).
// GET  /api/count  → returns { count: <number> }
// POST /api/count  → increments by 1, returns { count: <number> }

import { kv } from '@vercel/kv';

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
      let count = await kv.get(KEY);

      if (count === null || count === undefined) {
        // First-ever request — seed with baseline
        await kv.set(KEY, BASELINE);
        count = BASELINE;
      }

      return res.status(200).json({ count: Number(count) });

    } else if (req.method === 'POST') {
      // --- WRITE: Atomically increment count by 1 ---
      // INCR creates the key at 0 first, then increments.
      // If the key doesn't exist yet we seed it to BASELINE first.
      let current = await kv.get(KEY);

      if (current === null || current === undefined) {
        await kv.set(KEY, BASELINE);
      }

      const newCount = await kv.incr(KEY);

      return res.status(200).json({ count: Number(newCount) });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('[CAP Counter API Error]', err);
    // Gracefully return a fallback so the frontend never breaks
    return res.status(500).json({ count: BASELINE, error: 'DB unavailable' });
  }
}
