import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Modal, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import Grid from '@mui/material/Grid';
import DashboardWrapper from '../../components/DashboardWrapper';
import axios from 'axios';
import { SelectChangeEvent } from '@mui/material/Select';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';

interface Playlist {
  _id: string;
  name: string;
  description?: string;
  year: string;
  semester: string;
  subject: string; // subjectId or subjectName
}

interface Subject {
  _id: string;
  subjectName: string;
  year: string;
  semester: number;
}

const yearOptions = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
];
const semesterOptions: { [key: string]: { value: string; label: string }[] } = {
  '1': [ { value: '1', label: '1' }, { value: '2', label: '2' } ],
  '2': [ { value: '3', label: '3' }, { value: '4', label: '4' } ],
  '3': [ { value: '5', label: '5' }, { value: '6', label: '6' } ],
};

const VideoLibraryPage: React.FC = () => {
  const { token, user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectMap, setSubjectMap] = useState<{ [key: string]: string }>({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '', year: '', semester: '', subject: '' });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'year' | 'semester'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();

  const isStudent = user?.role === 'student';
  const isFaculty = user?.role === 'faculty';

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/video-library/playlists');
        setPlaylists(response.data.data);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };
    fetchPlaylists();
  }, []);

  // Fetch all subjects on mount for mapping
  useEffect(() => {
    const fetchAllSubjects = async () => {
      try {
        let response;
        if (isFaculty) {
          response = await axios.get('http://localhost:5001/api/faculty/subjects', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSubjectMap(Object.fromEntries((response.data.subjects || []).map((s: Subject) => [s._id, s.subjectName])));
        } else if (isStudent) {
          response = await axios.get('http://localhost:5001/api/student/courses', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSubjectMap(Object.fromEntries((response.data.courses || []).map((s: Subject) => [s._id, s.subjectName])));
        } else {
          response = await axios.get('http://localhost:5001/api/admin/subjects', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSubjectMap(Object.fromEntries((response.data.subjects || []).map((s: Subject) => [s._id, s.subjectName])));
        }
      } catch (error) {
        setSubjectMap({});
      }
    };
    fetchAllSubjects();
  }, [token, isFaculty, isStudent]);

  // Fetch subjects when year or semester changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!newPlaylist.year || !newPlaylist.semester) {
        setSubjects([]);
        return;
      }
      setLoadingSubjects(true);
      try {
        const yearMap: { [key: string]: string } = { '1': 'First', '2': 'Second', '3': 'Third' };
        const response = await axios.get('http://localhost:5001/api/admin/subjects', {
          params: { year: yearMap[newPlaylist.year], semester: newPlaylist.semester },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubjects(response.data.subjects || []);
      } catch (error) {
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [newPlaylist.year, newPlaylist.semester, token]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlaylist({ ...newPlaylist, [name]: value });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setNewPlaylist({ ...newPlaylist, [name as string]: value as string });
  };

  // Find subjects that already have a playlist for the selected year/semester
  const usedSubjectIds = playlists
    .filter(p => p.year === newPlaylist.year && p.semester === newPlaylist.semester)
    .map(p => p.subject);

  const handleSubmit = async () => {
    try {
      const payload = {
        name: newPlaylist.name,
        description: newPlaylist.description,
        year: newPlaylist.year,
        semester: newPlaylist.semester,
        subject: newPlaylist.subject, // send subjectId
      };
      const response = await axios.post('http://localhost:5001/api/video-library/playlists', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlaylists([...playlists, response.data.data]);
      handleClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    try {
      await axios.delete(`http://localhost:5001/api/video-library/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlaylists(playlists.filter(p => p._id !== playlistId));
    } catch (error) {
      alert('Failed to delete playlist.');
    }
  };

  // Sorting and searching logic
  const filteredPlaylists = playlists
    .filter(p => {
      // For students, only show playlists matching their year and semester
      if (isStudent && user?.classYear && user?.semester) {
        return p.year === String(user.classYear) && p.semester === String(user.semester);
      }
      return true;
    })
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (subjectMap[p.subject] || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let valA: string | number = a[sort];
      let valB: string | number = b[sort];
      if (sort === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      }
      if (sort === 'year' || sort === 'semester') {
        valA = Number(valA);
        valB = Number(valB);
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <DashboardWrapper>
      <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Video Library</Typography>
          <Box display="flex" gap={2}>
            <TextField
              size="small"
              placeholder="Search by name or subject"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sort}
                label="Sort By"
                onChange={e => setSort(e.target.value as any)}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="year">Year</MenuItem>
                <MenuItem value="semester">Semester</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Order</InputLabel>
              <Select
                value={sortDir}
                label="Order"
                onChange={e => setSortDir(e.target.value as any)}
              >
                <MenuItem value="asc">Asc</MenuItem>
                <MenuItem value="desc">Desc</MenuItem>
              </Select>
            </FormControl>
            {!isStudent && (
              <Button variant="contained" color="primary" onClick={handleOpen}>Create Playlist</Button>
            )}
          </Box>
        </Box>
        <Grid container spacing={3}>
          {filteredPlaylists.map((playlist) => (
            <Grid item xs={12} sm={6} md={4} key={playlist._id}>
              <Card
                sx={{ width: 300, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', borderRadius: 3, boxShadow: 3, transition: '0.2s', '&:hover': { boxShadow: 8, transform: 'translateY(-4px) scale(1.03)' } }}
                onClick={() => navigate(`/lecture-videos/${playlist._id}`)}
              >
                <CardContent sx={{ flex: 1, overflow: 'hidden' }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.name}</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.description}</Typography>
                  <Box display="flex" flexDirection="column" gap={0.5} mt={1}>
                    <Typography variant="body2" color="text.secondary">Year: <b>{playlist.year}</b></Typography>
                    <Typography variant="body2" color="text.secondary">Semester: <b>{playlist.semester}</b></Typography>
                    <Typography variant="body2" color="text.secondary">Subject: <b>{subjectMap[playlist.subject] || playlist.subject}</b></Typography>
                  </Box>
                </CardContent>
                {!isStudent && user?.role === 'admin' && (
                  <IconButton aria-label="delete" onClick={e => { e.stopPropagation(); handleDeletePlaylist(playlist._id); }}>
                    <DeleteIcon color="error" />
                  </IconButton>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>

        <Modal open={open} onClose={handleClose}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4 }}>
            <Typography variant="h6" component="h2">Create New Playlist</Typography>
            <TextField fullWidth label="Name" name="name" value={newPlaylist.name} onChange={handleInputChange} margin="normal" required />
            <TextField fullWidth label="Description (optional)" name="description" value={newPlaylist.description} onChange={handleInputChange} margin="normal" />
            <FormControl fullWidth margin="normal">
              <InputLabel>Year</InputLabel>
              <Select name="year" value={newPlaylist.year} onChange={handleSelectChange} label="Year">
                {yearOptions.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" disabled={!newPlaylist.year}>
              <InputLabel>Semester</InputLabel>
              <Select name="semester" value={newPlaylist.semester} onChange={handleSelectChange} label="Semester">
                {(semesterOptions[newPlaylist.year] || []).map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" disabled={!newPlaylist.year || !newPlaylist.semester || loadingSubjects}>
              <InputLabel>Subject</InputLabel>
              <Select name="subject" value={newPlaylist.subject} onChange={handleSelectChange} label="Subject">
                {subjects.map(subject => (
                  <MenuItem key={subject._id} value={subject._id} disabled={usedSubjectIds.includes(subject._id)}>
                    {subject.subjectName} {usedSubjectIds.includes(subject._id) ? '(Already has playlist)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" color="primary" onClick={handleSubmit} sx={{ mt: 2 }} disabled={!newPlaylist.name || !newPlaylist.year || !newPlaylist.semester || !newPlaylist.subject}>Submit</Button>
          </Box>
        </Modal>
      </Box>
    </DashboardWrapper>
  );
};

export default VideoLibraryPage; 