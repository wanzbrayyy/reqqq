const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/user');
const Message = require('../models/message');
const { isProfane } = require('../utils/contentFilter');
const { getSeasonalClass } = require('../utils/seasonalTheme');
const router = express.Router();

const messageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Terlalu banyak permintaan. Coba lagi dalam 10 menit.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/:username', async (req, res) => {
  const username = req.params.username.toLowerCase().trim();
  if (!username) return res.status(400).render('404', { title: 'User Tidak Ditemukan', userId: null });
  
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).render('404', { title: 'User Tidak Ditemukan', userId: null });
  }

  const replyTo = req.query.reply;

  res.render('public-profile', { 
    title: `Kirim ke @${username} - Wanz Req`,
    username: user.username,
    userId: user._id,
    user,
    replyTo,
    req,
    seasonalClass: getSeasonalClass()
  });
});

router.post('/send', messageLimiter, async (req, res) => {
  const { to, content, username, category } = req.body;
  if (!to || !content || !username) {
    return res.status(400).send('Data tidak lengkap.');
  }

  const user = await User.findById(to);
  if (!user) return res.status(400).send('Pengguna tidak ditemukan.');

  const trimmed = content.trim();
  if (trimmed.length === 0) return res.status(400).send('Pesan tidak boleh kosong!');
  if (trimmed.length > 280) return res.status(400).send('Pesan maksimal 280 karakter!');
  if (isProfane(trimmed)) return res.status(400).send('Pesan mengandung kata tidak pantas.');

  // Filter blokir kata
  if (user.blockedWords.length > 0) {
    const lower = trimmed.toLowerCase();
    const hasBlocked = user.blockedWords.some(word => lower.includes(word));
    if (hasBlocked) return res.status(400).send('Pesan mengandung kata yang diblokir.');
  }

  // Mode pujian saja
  if (user.praiseOnly) {
    const praiseWords = ['keren', 'hebat', 'bagus', 'kamu', 'semangat', 'sukses', 'cantik', 'ganteng', 'top', 'mantap', 'luar biasa', 'keren banget', 'keren sekali'];
    const hasPraise = praiseWords.some(word => trimmed.toLowerCase().includes(word));
    if (!hasPraise) return res.status(400).send('Mode ini hanya menerima pesan positif.');
  }

  try {
    const message = new Message({ 
      to, 
      content: trimmed,
      category: category || 'umum'
    });
    await message.save();
    res.redirect(`/${username}?sent=1`);
  } catch (err) {
    res.status(500).send('Gagal mengirim pesan. Coba lagi nanti.');
  }
});

// Embed widget
router.get('/embed/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!user) return res.status(404).send('User tidak ditemukan');
  res.render('embed', { user, host: req.headers.host });
});

module.exports = router;