// /pages/api/ask.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, gradeLevel, stepByStep } = req.body;

  const finalPrompt = `
You are a helpful homework assistant for a ${gradeLevel} student.
${stepByStep ? "Explain the answer step-by-step." : ""}
Question: ${prompt}
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: finalPrompt }],
      model: 'gpt-4o',
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;
    res.status(200).json({ answer });
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
}
