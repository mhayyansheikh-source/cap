// api/cleanup-cards.js — Vercel Cron Job
// Runs every 6 hours. Deletes card blobs from Vercel Blob that are older than 48 hours.
// Vercel automatically passes Authorization: Bearer <CRON_SECRET> header.

import { del, list } from '@vercel/blob';
import { createClient } from 'redis';

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

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;

export default async function handler(req, res) {
  // Security: reject any request that isn't from Vercel Cron or an authorized manual call
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  let deletedBlobs = 0;
  let checkedBlobs = 0;
  const errors = [];

  try {
    // List all blobs under the cards/ prefix
    const { blobs } = await list({ prefix: 'cards/' });
    checkedBlobs = blobs.length;

    for (const blob of blobs) {
      const uploadedAt = new Date(blob.uploadedAt).getTime();
      const age = now - uploadedAt;

      if (age >= FORTY_EIGHT_H_MS) {
        try {
          await del(blob.url);
          deletedBlobs++;

          // Also clean up the Redis metadata entry if still present
          // Extract memberId from filename: cards/CAP-PK-XXXXXX-timestamp.png
          const filenamePart = blob.pathname?.split('/')[1] || '';
          const memberIdMatch = filenamePart.match(/^(CAP-PK-[A-Z0-9]{6})/);
          if (memberIdMatch) {
            const redis = await getRedis();
            await redis.del(`blob:${memberIdMatch[1]}`).catch(() => {});
          }

          console.log(`[cleanup] Deleted ${blob.url} (age: ${Math.floor(age / 3600000)}h)`);
        } catch (deleteErr) {
          errors.push({ url: blob.url, error: deleteErr.message });
        }
      }
    }

    return res.status(200).json({
      ok: true,
      checkedBlobs,
      deletedBlobs,
      errors: errors.length > 0 ? errors : undefined,
      ranAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('[cleanup-cards error]', err);
    return res.status(500).json({ error: err.message });
  }
}
