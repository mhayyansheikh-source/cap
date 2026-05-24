// api/count.js — Vercel Serverless Function
// Backed by Vercel KV (managed Redis) with Vercel Postgres fallback.
// GET  /api/count  → returns { count: <number> }
// POST /api/count  → increments by 1, returns { count: <number> }

import { createClient } from 'redis';
import { sql } from '@vercel/postgres';

const KEY = 'cap_reg_count_v2';
const BASELINE = 0; // Starting count if key doesn't exist yet

let redisClient;
async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.KV_URL || process.env.REDIS_URL
    });
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

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
        const redis = await getRedis();
        count = await redis.get(KEY);
        if (count === null || count === undefined) {
          await redis.set(KEY, String(BASELINE));
          count = BASELINE;
        }
      } catch (kvErr) {
        console.warn('[CAP Counter Redis Fallback] Redis failed, reading Postgres:', kvErr.message);
        // Fallback to Vercel Postgres
        const pgRes = await sql`SELECT COUNT(*) as count FROM registrations`;
        count = parseInt(pgRes.rows[0].count, 10) || 0;
      }

      return res.status(200).json({ count: Number(count) });

    } else if (req.method === 'POST') {
      // --- WRITE: Atomically increment count by 1 ---
      let newCount;
      try {
        const redis = await getRedis();
        let current = await redis.get(KEY);
        if (current === null || current === undefined) {
          await redis.set(KEY, String(BASELINE));
        }
        newCount = await redis.incr(KEY);
      } catch (kvErr) {
        console.warn('[CAP Counter Redis POST Fallback] Redis failed, reading Postgres:', kvErr.message);
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
