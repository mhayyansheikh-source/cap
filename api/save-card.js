// api/save-card.js — Vercel Serverless Function
// Receives a base64 PNG of the member card, uploads to Vercel Blob,
// stores metadata in KV for the cleanup cron, and returns the public URL.
// No email dependency — notifications are handled entirely on the client side.
// POST /api/save-card → { ok: true, cardUrl, downloadDeadline, deleteAt }

import { put, del, list } from '@vercel/blob';
import { kv } from '@vercel/kv';

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;
const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, memberId, name } = req.body || {};

    if (!imageBase64 || !memberId || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Strip data URL prefix → raw base64 → Buffer
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    if (imageBuffer.length < 1000) {
      return res.status(400).json({ error: 'Image too small — capture may have failed' });
    }

    // ── Upload to Vercel Blob (public, no random suffix — deterministic URL) ───
    const filename = `cards/${memberId}-${Date.now()}.png`;
    const blob = await put(filename, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
      addRandomSuffix: false
    });

    const uploadedAt = Date.now();
    const downloadDeadline = uploadedAt + TWENTY_FOUR_H_MS; // user prompted to download within 24h
    const deleteAt         = uploadedAt + FORTY_EIGHT_H_MS; // hard-delete by cron at 48h

    // ── Store metadata in KV so cleanup cron can find & delete the blob ────────
    // KV TTL = 50h (2h safety buffer after the 48h delete window)
    await kv.set(
      `blob:${memberId}`,
      JSON.stringify({ url: blob.url, name, memberId, uploadedAt, downloadDeadline, deleteAt }),
      { ex: 50 * 3600 }
    );

    // ── Lazy Cleanup (20% of requests) ──────────────────────────────────────────
    if (Math.random() < 0.2) {
      try {
        const { blobs } = await list({ prefix: 'cards/' });
        const now = Date.now();
        for (const b of blobs) {
          const bUploadedAt = new Date(b.uploadedAt).getTime();
          const age = now - bUploadedAt;
          if (age >= FORTY_EIGHT_H_MS) {
            await del(b.url);
            // clean up KV metadata
            const filenamePart = b.pathname?.split('/')[1] || '';
            const memberIdMatch = filenamePart.match(/^(CAP-PK-[A-Z0-9]{6})/);
            if (memberIdMatch) {
              await kv.del(`blob:${memberIdMatch[1]}`).catch(() => {});
            }
            console.log(`[lazy-cleanup] Deleted ${b.url} (age: ${Math.floor(age / 3600000)}h)`);
          }
        }
      } catch (cleanErr) {
        console.error('[lazy-cleanup error]', cleanErr);
      }
    }

    return res.status(200).json({
      ok: true,
      cardUrl: blob.url,
      downloadDeadline,
      deleteAt
    });

  } catch (err) {
    console.error('[save-card error]', err?.message || err);
    return res.status(500).json({ error: 'Could not save card. Please try again.' });
  }
}
