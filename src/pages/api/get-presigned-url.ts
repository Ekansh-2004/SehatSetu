import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePresignedUrl } from '@/lib/s3-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { s3Url } = req.body;
  if (!s3Url) {
    return res.status(400).json({ error: 'Missing s3Url' });
  }
  try {
    const presignedUrl = await generatePresignedUrl(s3Url, 3600);
    if (!presignedUrl) {
      return res.status(500).json({ error: 'Failed to generate presigned URL' });
    }
    return res.status(200).json({ presignedUrl });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
} 