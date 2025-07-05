// models/User.ts
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: { type: String },
  credits: { type: Number, default: 3 },
  history: [{ question: String, answer: String, timestamp: Number }],
  subscribed: { type: Boolean, default: false },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
