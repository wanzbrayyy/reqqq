const express = require('express');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const { isProfane } = require('../utils/contentFilter');
const { generateMagicToken } = require('../utils/magicLink');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('index', { title: 'Wanz Req - Kirim Pesan Anonim!', userId: null });
});

router.get('/register', (req, res) => {
  res.render('register', { title: 'Daftar - Wanz Req', error: null, userId: null });
});

router.post('/register', async (req, res) => {
  const { username, email, password, shortLink } = req.body;
  if (isProfane(username)) {
    return res.render('register', { 
      title: 'Daftar - Wanz Req',
      error: 'Username mengandung kata tidak pantas',
      userId: null
    });
  }
  try {
    const user = new User({ 
      username, 
      email, 
      password,
      shortLink: shortLink || undefined
    });
    await user.save();
    req.session.userId = user._id;
    req.session.userToken = req.sessionID;
    // Simpan session
    user.sessions.push({
      token: req.sessionID,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    await user.save();
    res.redirect('/onboarding');
  } catch (err) {
    let msg = 'Terjadi kesalahan';
    if (err.code === 11000) msg = 'Username, email, atau link pendek sudah digunakan!';
    if (err.name === 'ValidationError') msg = Object.values(err.errors).map(e => e.message).join(', ');
    res.render('register', { title: 'Daftar - Wanz Req', error: msg, userId: null });
  }
});

router.get('/login', (req, res) => {
  res.render('login', { title: 'Masuk - Wanz Req', error: null, userId: null, magicSent: req.query.magic });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) {
    return res.render('login', { error: 'Username tidak ditemukan', title: 'Masuk - Wanz Req', userId: null });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.render('login', { error: 'Password salah', title: 'Masuk - Wanz Req', userId: null });
  }
  req.session.userId = user._id;
  req.session.userToken = req.sessionID;
  user.sessions.push({
    token: req.sessionID,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  await user.save();
  res.redirect('/dashboard');
});

// Magic Link
router.post('/magic', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('Email tidak ditemukan');
  }
  const token = generateMagicToken();
  user.magicToken = token;
  user.magicTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 menit
  await user.save();
  
  // Di development, tampilkan token di console
  console.log(`✨ Magic Link untuk ${email}: http://localhost:3000/magic/${token}`);
  res.redirect('/login?magic=1');
});

router.get('/magic/:token', async (req, res) => {
  const user = await User.findOne({
    magicToken: req.params.token,
    magicTokenExpiry: { $gt: new Date() }
  });
  if (!user) {
    return res.status(400).send('Link tidak valid atau sudah kadaluarsa');
  }
  req.session.userId = user._id;
  req.session.userToken = req.sessionID;
  user.sessions.push({
    token: req.sessionID,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  user.magicToken = undefined;
  user.magicTokenExpiry = undefined;
  await user.save();
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Onboarding
router.get('/onboarding', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = await User.findById(req.session.userId);
  if (!user) return res.redirect('/login');
  if (user.completedOnboarding) return res.redirect('/dashboard');
  res.render('onboarding', { title: 'Selamat Datang!', user, userId: req.session.userId });
});

router.post('/onboarding', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  await User.findByIdAndUpdate(req.session.userId, { completedOnboarding: true });
  res.redirect('/dashboard');
});

module.exports = router;