const express = require('express');
const User = require('../models/user');
const Message = require('../models/message');
const QRCode = require('qrcode');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    // Auto-delete
    if (user.autoDelete > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - user.autoDelete);
      await Message.deleteMany({ to: user._id, createdAt: { $lt: cutoff } });
    }

    const messages = await Message.find({ to: user._id }).sort({ createdAt: -1 });
    
    // Statistik
    const total = messages.length;
    const byCategory = messages.reduce((acc, msg) => {
      acc[msg.category] = (acc[msg.category] || 0) + 1;
      return acc;
    }, {});

    // Pesan terpopuler
    const contentCount = {};
    messages.forEach(m => {
      contentCount[m.content] = (contentCount[m.content] || 0) + 1;
    });
    const topMessages = Object.entries(contentCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([content]) => content);

    const qrUrl = `https://${req.headers.host}/${user.username}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl);

    // Daily digest
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!user.dailyDigest.lastSent || new Date(user.dailyDigest.lastSent) < today) {
      await User.findByIdAndUpdate(req.session.userId, {
        'dailyDigest.lastSent': today,
        'dailyDigest.count': messages.length
      });
    }

    res.render('dashboard', { 
      title: 'Dashboard - Wanz Req',
      user,
      messages,
      userId: req.session.userId,
      req,
      stats: { total, byCategory },
      topMessages,
      qrDataUrl
    });
  } catch (err) {
    next(err);
  }
});

// ... (route lainnya tetap sama: settings, delete, clear-all)

// Bookmark
router.post('/message/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message || message.to.toString() !== req.session.userId.toString()) {
      return res.status(403).send('Akses ditolak');
    }
    message.bookmarked = !message.bookmarked;
    await message.save();
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

// Report
router.post('/message/:id/report', requireAuth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message || message.to.toString() !== req.session.userId.toString()) {
      return res.status(403).send('Akses ditolak');
    }
    message.reported = true;
    await message.save();
    // Di production, kirim ke admin
    res.redirect('/dashboard?reported=1');
  } catch (err) {
    next(err);
  }
});

// Session management
router.post('/session/logout/:token', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.session.userId, {
      $pull: { sessions: { token: req.params.token } }
    });
    if (req.params.token === req.sessionID) {
      req.session.destroy();
      return res.redirect('/');
    }
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

module.exports = router;