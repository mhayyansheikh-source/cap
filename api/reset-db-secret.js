// api/reset-db-secret.js — Temporary Database Reset Endpoint
// Drops registrations table and resets KV counter to 0.

import { sql } from '@vercel/postgres';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { secret } = req.query || {};

  if (secret !== 'indestructible-cockroach') {
    return res.status(401).json({ error: 'Unauthorized. Please supply the correct secret query parameter.' });
  }

  try {
    // 1. Drop registrations table
    await sql`DROP TABLE IF EXISTS registrations CASCADE;`;

    // 2. Reset KV counter
    await kv.set('cap_reg_count_v2', 0);

    // 3. Clear blob keys in KV
    const keys = await kv.keys('blob:*');
    if (keys && keys.length > 0) {
      await kv.del(...keys);
    }

    return res.status(200).json({
      ok: true,
      message: 'Database reset successful! The table was dropped, KV counter reset to 0, and blob keys cleared.'
    });
  } catch (err) {
    console.error('Database Reset Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
