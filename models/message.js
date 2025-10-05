const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['umum', 'pujian', 'saran', 'pertanyaan'],
    default: 'umum'
  },
  bookmarked: {
    type: Boolean,
    default: false
  },
  reported: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);