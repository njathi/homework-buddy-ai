// pages/api/auth/signup.ts
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  await dbConnect();

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already in use' });

  const hashed = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    email,
    password: hashed,
    credits: 3,
  });

  res.status(200).json({ message: 'Signup successful' });
}
