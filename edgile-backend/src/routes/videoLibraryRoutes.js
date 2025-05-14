const express = require('express');
const router = express.Router();

const videoLibraryController = require('../controllers/videoLibraryController');
const { protect } = require('../middleware/authMiddleware');

// Playlists
router.get('/playlists', videoLibraryController.listPlaylists);
router.post('/playlists', protect, videoLibraryController.createPlaylist);
router.put('/playlists/:id', protect, videoLibraryController.editPlaylist);
router.delete('/playlists/:id', protect, videoLibraryController.deletePlaylist);

// Videos
router.get('/playlists/:playlistId/videos', videoLibraryController.listVideos);
router.post('/playlists/:playlistId/videos', protect, videoLibraryController.addVideo);
router.delete('/videos/:id', protect, videoLibraryController.deleteVideo);

module.exports = router; 