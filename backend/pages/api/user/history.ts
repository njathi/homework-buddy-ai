// pages/api/user/history.ts
import dbConnect from '@/lib/db';
import User from '@/models/User';

export default async function handler(req, res) {
  const { userId } = req.method === 'GET' ? req.query : req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  await dbConnect();
  const user = await User.findOne({ email: userId });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'GET') {
    res.status(200).json({ history: user.history || [] });
  } else if (req.method === 'POST') {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'Missing question/answer' });

    user.history.unshift({ question, answer, timestamp: Date.now() });
    user.history = user.history.slice(0, 20); // keep only last 20
    await user.save();

    res.status(200).json({ message: 'Saved to history' });
  } else {
    res.status(405).end(); // Method not allowed
  }
}
