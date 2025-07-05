// pages/api/ocr.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Tesseract from 'tesseract.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, userId } = req.body;
  if (!image || !image.startsWith('data:image')) {
    return res.status(400).json({ error: 'Invalid or missing image data' });
  }

  try {
    const result = await Tesseract.recognize(image, 'eng', {
      logger: m => console.log(`[OCR] ${m.status} - ${m.progress}`),
    });

    const text = result.data.text;
    console.log(`[OCR] Extracted text:`, text);

    res.status(200).json({ text });
  } catch (err) {
    console.error('[OCR] Failed:', err);
    res.status(500).json({ error: 'OCR processing failed' });
  }
}
