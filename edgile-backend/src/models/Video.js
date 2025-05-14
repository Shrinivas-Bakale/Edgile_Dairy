const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  playlistId: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoPlaylist', required: true },
  title: { type: String, required: true },
  description: { type: String },
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', VideoSchema); 