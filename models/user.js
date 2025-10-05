const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9_]{3,20}$/, 'Username hanya boleh huruf, angka, underscore (3-20 karakter)']
  },
  shortLink: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: 'Hai! Kirim aku pesan anonim ya 😊',
    maxlength: 100
  },
  emoji: {
    type: String,
    default: '💬'
  },
  mood: {
    type: String,
    enum: ['senang', 'bingung', 'semangat', 'tenang', 'kreatif'],
    default: 'senang'
  },
  blockedWords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  praiseOnly: {
    type: Boolean,
    default: false
  },
  autoDelete: {
    type: Number, // 0 = never, 1 = 24h, 7 = 7 days
    default: 0
  },
  completedOnboarding: {
    type: Boolean,
    default: false
  },
  magicToken: String,
  magicTokenExpiry: Date,
  sessions: [{
    token: String,
    userAgent: String,
    ip: String,
    createdAt: { type: Date, default: Date.now }
  }],
  dailyDigest: {
    lastSent: Date,
    count: { type: Number, default: 0 }
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('User', userSchema);