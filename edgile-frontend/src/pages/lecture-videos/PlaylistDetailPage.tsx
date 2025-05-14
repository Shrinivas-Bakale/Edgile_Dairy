import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Modal, TextField, InputLabel, FormControl } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DashboardWrapper from '../../components/DashboardWrapper';

interface Video {
  _id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail?: string;
  uploader?: {
    name: string;
    role: string;
  };
}

const PlaylistDetailPage: React.FC = () => {
  const { playlistId } = useParams();
  const { token, user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [open, setOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', description: '', url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [embedError, setEmbedError] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/api/video-library/playlists/${playlistId}/videos`);
        setVideos(res.data.data);
      } catch (e) {
        setVideos([]);
      }
    };
    fetchVideos();
  }, [playlistId]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => { setOpen(false); setError(''); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVideo({ ...newVideo, [name]: value });
  };

  const validateUrl = (url: string) => {
    // Basic YouTube or video URL validation
    return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com|.+\.(mp4|webm|ogg))/.test(url);
  };

  const handleUpload = async () => {
    if (!newVideo.title || !newVideo.url) {
      setError('Title and video link are required.');
      return;
    }
    if (!validateUrl(newVideo.url)) {
      setError('Please provide a valid video link (YouTube, Vimeo, Google Drive, or direct mp4/webm/ogg).');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:5001/api/video-library/playlists/${playlistId}/videos`, newVideo, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVideos([...videos, res.data.data]);
      setOpen(false);
      setNewVideo({ title: '', description: '', url: '' });
      setError('');
    } catch (e) {
      setError('Failed to upload video.');
    } finally {
      setLoading(false);
    }
  };

  const getYoutubeThumbnail = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
  };

  const getDriveEmbedUrl = (url: string) => {
    // Match Google Drive file ID from various link formats
    const match = url.match(/(?:\/d\/|id=)([\w-]{25,})/);
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
  };

  const getCreativeThumbnail = (video: Video) => {
    // Use subject/topic initials and a color
    const initials = (video.title || 'V').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const colors = ['#6C63FF', '#FF6584', '#43E6FC', '#FFD600', '#FF8A65', '#4CAF50'];
    const color = colors[(video.title?.charCodeAt(0) || 0) % colors.length];
    return (
      <Box sx={{ width: '100%', height: 180, bgcolor: color, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h2" color="#fff">{initials}</Typography>
      </Box>
    );
  };

  return (
    <DashboardWrapper>
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Playlist Videos</Typography>
          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <Button variant="contained" color="primary" onClick={handleOpen}>Upload Video</Button>
          )}
        </Box>
        <Box>
          {videos.length === 0 ? (
            <Typography>No videos in this playlist yet.</Typography>
          ) : (
            <Box display="flex" flexWrap="wrap" gap={3}>
              {videos.map(video => (
                <Card key={video._id} sx={{ width: 320, borderRadius: 3, boxShadow: 2 }}>
                  <CardContent>
                    <Box mb={1}>
                      {getYoutubeThumbnail(video.url) ? (
                        <img src={getYoutubeThumbnail(video.url)!} alt={video.title} style={{ width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover' }} />
                      ) : video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} style={{ width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover' }} />
                      ) : (
                        getCreativeThumbnail(video)
                      )}
                    </Box>
                    <Typography variant="h6">{video.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{video.description}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Uploaded by: <b>{video.uploader?.name || 'Unknown'}</b> ({video.uploader?.role || 'unknown'})
                    </Typography>
                    <Button sx={{ mt: 1 }} fullWidth variant="outlined" onClick={() => { setCurrentVideo(video); setPlayerOpen(true); setEmbedError(false); }}>Watch Video</Button>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
        <Modal open={open} onClose={handleClose}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4 }}>
            <Typography variant="h6" mb={2}>Upload Video</Typography>
            <TextField fullWidth label="Title" name="title" value={newVideo.title} onChange={handleInputChange} margin="normal" required />
            <TextField fullWidth label="Description (optional)" name="description" value={newVideo.description} onChange={handleInputChange} margin="normal" />
            <TextField fullWidth label="Video Link" name="url" value={newVideo.url} onChange={handleInputChange} margin="normal" required />
            {error && <Typography color="error" mt={1}>{error}</Typography>}
            <Button variant="contained" color="primary" onClick={handleUpload} sx={{ mt: 2 }} disabled={loading}>Upload</Button>
          </Box>
        </Modal>
        <Dialog open={playerOpen} onClose={() => setPlayerOpen(false)} maxWidth="md" fullWidth>
          <DialogContent sx={{ p: 0 }}>
            {currentVideo && getYoutubeThumbnail(currentVideo.url) && !embedError ? (
              <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${getYoutubeThumbnail(currentVideo.url)!.split('/').pop()?.replace('.jpg','')}`}
                  title={currentVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  onError={() => setEmbedError(true)}
                />
              </Box>
            ) : currentVideo && getYoutubeThumbnail(currentVideo.url) && embedError ? (
              <Box p={4} textAlign="center">
                <Typography color="error" mb={2}>This video cannot be embedded. Please watch it on YouTube.</Typography>
                <Button variant="contained" color="primary" href={currentVideo.url} target="_blank" rel="noopener">Watch on YouTube</Button>
              </Box>
            ) : currentVideo && getDriveEmbedUrl(currentVideo.url) ? (
              <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                <iframe
                  src={getDriveEmbedUrl(currentVideo.url)!}
                  title={currentVideo.title}
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </Box>
            ) : currentVideo && (currentVideo.url.endsWith('.mp4') || currentVideo.url.endsWith('.webm') || currentVideo.url.endsWith('.ogg')) ? (
              <video src={currentVideo.url} controls style={{ width: '100%', height: 480, background: '#000' }} />
            ) : currentVideo && currentVideo.url.includes('vimeo.com') ? (
              <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
                <iframe
                  src={`https://player.vimeo.com/video/${currentVideo.url.split('/').pop()}`}
                  title={currentVideo.title}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </Box>
            ) : (
              <Box p={4} textAlign="center">Unable to preview this video type.</Box>
            )}
            {currentVideo && getYoutubeThumbnail(currentVideo.url) && (
              <Box p={2} textAlign="center">
                <Button variant="outlined" color="primary" href={currentVideo.url} target="_blank" rel="noopener">Watch on YouTube</Button>
              </Box>
            )}
            {currentVideo && getDriveEmbedUrl(currentVideo.url) && (
              <Box p={2} textAlign="center">
                <Button variant="outlined" color="primary" href={currentVideo.url} target="_blank" rel="noopener">Open in Google Drive</Button>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardWrapper>
  );
};

export default PlaylistDetailPage; 