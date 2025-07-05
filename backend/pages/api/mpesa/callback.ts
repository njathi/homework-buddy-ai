// pages/api/mpesa/callback.ts
import dbConnect from '@/lib/db';
import User from '@/models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const stkCallback = req.body?.Body?.stkCallback;
    const resultCode = stkCallback?.ResultCode;
    const metadata = stkCallback?.CallbackMetadata?.Item;

    const phone = metadata?.find((i) => i.Name === 'PhoneNumber')?.Value;
    const amount = metadata?.find((i) => i.Name === 'Amount')?.Value;
    const accountReference = stkCallback?.MerchantRequestID; // You may also use AccountReference

    if (resultCode === 0 && phone && amount) {
      const userId = req.body.Body.stkCallback.CallbackMetadata?.Item.find(i => i.Name === "AccountReference")?.Value;

      await dbConnect();
      const user = await User.findOne({ email: userId });
      if (user) {
        user.credits += parseInt(amount); // 1 KES = 1 credit (customize logic here)
        await user.save();
        console.log(`[M-PESA] Credited ${amount} to ${user.email}`);
      }
    }

    // Acknowledge Safaricom
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[M-PESA Callback] Error:', err);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Failed to process callback' });
  }
}
