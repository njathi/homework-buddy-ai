// pages/api/mpesa/stk-push.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, amount, userId } = req.body;
  if (!phone || !amount || !userId) return res.status(400).json({ error: 'Missing fields' });

  const env = process.env.MPESA_ENV || 'sandbox';
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const callbackUrl = process.env.MPESA_CALLBACK_URL!;

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

  try {
    const tokenRes = await axios.get(
      `https://${env}.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`,
      {
        auth: { username: consumerKey, password: consumerSecret },
      }
    );

    const accessToken = tokenRes.data.access_token;

    const stkRes = await axios.post(
      `https://${env}.safaricom.co.ke/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: userId,
        TransactionDesc: 'Homework Buddy Credits',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    res.status(200).json({ message: 'STK Push sent. Check your phone.', data: stkRes.data });
  } catch (err) {
    console.error('[M-PESA STK] Error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate STK Push' });
  }
}
