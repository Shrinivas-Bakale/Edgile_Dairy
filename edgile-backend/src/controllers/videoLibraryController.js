const VideoPlaylist = require('../models/VideoPlaylist');
const Video = require('../models/Video');

// Placeholder controller for video library

// List all playlists, optionally filtered by year and semester
exports.listPlaylists = async (req, res) => {
  try {
    const { year, semester } = req.query;
    const filter = {};
    if (year) filter.year = year;
    if (semester) filter.semester = semester;
    // Try to populate from all possible user models
    const playlists = await VideoPlaylist.find(filter)
      .populate({ path: 'createdBy', model: 'Admin', select: 'name email role' })
      .populate({ path: 'createdBy', model: 'Faculty', select: 'name email role' })
      .populate({ path: 'createdBy', model: 'Student', select: 'name email role' })
      .lean();
    res.status(200).json({ success: true, data: playlists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new playlist
exports.createPlaylist = async (req, res) => {
  try {
    const { name, description, year, semester, subject } = req.body;
    const playlist = new VideoPlaylist({
      name,
      description,
      year,
      semester,
      subject,
      createdBy: req.user._id
    });
    await playlist.save();
    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Edit a playlist
exports.editPlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, year, semester, subject } = req.body;
    const playlist = await VideoPlaylist.findById(id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found' });
    playlist.name = name || playlist.name;
    playlist.description = description || playlist.description;
    playlist.year = year || playlist.year;
    playlist.semester = semester || playlist.semester;
    playlist.subject = subject || playlist.subject;
    await playlist.save();
    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a playlist (admin only)
exports.deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const playlist = await VideoPlaylist.findById(id);
    if (!playlist) return res.status(404).json({ success: false, message: 'Playlist not found' });
    await VideoPlaylist.deleteOne({ _id: id });
    res.status(200).json({ success: true, message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// List videos in a playlist
exports.listVideos = async (req, res) => {
  try {
    const { playlistId } = req.params;
    // Use aggregation to fetch uploader info from Admin, Faculty, or Student
    const videos = await Video.aggregate([
      { $match: { playlistId: require('mongoose').Types.ObjectId(playlistId) } },
      {
        $lookup: {
          from: 'admins',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'adminUploader'
        }
      },
      {
        $lookup: {
          from: 'faculties',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'facultyUploader'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'studentUploader'
        }
      },
      {
        $addFields: {
          uploader: {
            $cond: [
              { $gt: [ { $size: '$adminUploader' }, 0 ] },
              { name: { $arrayElemAt: ['$adminUploader.name', 0] }, role: 'admin' },
              {
                $cond: [
                  { $gt: [ { $size: '$facultyUploader' }, 0 ] },
                  { name: { $arrayElemAt: ['$facultyUploader.name', 0] }, role: 'faculty' },
                  {
                    $cond: [
                      { $gt: [ { $size: '$studentUploader' }, 0 ] },
                      { name: { $arrayElemAt: ['$studentUploader.name', 0] }, role: 'student' },
                      { name: 'Unknown', role: 'unknown' }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $project: {
          adminUploader: 0,
          facultyUploader: 0,
          studentUploader: 0
        }
      }
    ]);
    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a video to a playlist
exports.addVideo = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const { title, description, url } = req.body;
    // Validate video link (placeholder for now)
    if (!url) return res.status(400).json({ success: false, message: 'Video URL is required' });
    const video = new Video({
      playlistId,
      title,
      description,
      url,
      uploadedBy: req.user._id
    });
    await video.save();
    res.status(201).json({ success: true, data: video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a video (admin or faculty who uploaded it)
exports.deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });
    if (req.user.role !== 'admin' && video.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await Video.deleteOne({ _id: id });
    res.status(200).json({ success: true, message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; 