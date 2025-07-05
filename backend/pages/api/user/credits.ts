// pages/api/user/credits.ts
import dbConnect from '@/lib/db';
import User from '@/models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = req.query;
  await dbConnect();

  const user = await User.findOne({ email: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.status(200).json({ credits: user.credits });
}
