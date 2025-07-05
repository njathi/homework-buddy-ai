// pages/api/user/deduct-credit.ts
import dbConnect from '@/lib/db';
import User from '@/models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = req.body;
  await dbConnect();

  const user = await User.findOne({ email: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.credits = Math.max(0, user.credits - 1);
  await user.save();

  res.status(200).json({ credits: user.credits });
}
