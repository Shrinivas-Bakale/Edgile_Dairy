const mongoose = require('mongoose');

const VideoPlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  year: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VideoPlaylist', VideoPlaylistSchema); 