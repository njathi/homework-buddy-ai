// pages/api/user/subscription.ts
import dbConnect from '@/lib/db';
import User from '@/models/User';

export default async function handler(req, res) {
  const { userId } = req.method === 'GET' ? req.query : req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  await dbConnect();
  const user = await User.findOne({ email: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'GET') {
    res.status(200).json({ subscribed: user.subscribed });
  } else if (req.method === 'POST') {
    const { subscribe } = req.body;
    if (typeof subscribe !== 'boolean') return res.status(400).json({ error: 'Missing subscribe flag' });

    user.subscribed = subscribe;
    if (subscribe) user.credits = 9999;
    await user.save();

    res.status(200).json({ subscribed: user.subscribed, credits: user.credits });
  } else {
    res.status(405).end(); // Method Not Allowed
  }
}
