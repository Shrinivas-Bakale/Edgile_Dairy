import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  Card,
  CardContent,
  Alert,
  SelectChangeEvent,
  Dialog,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
  Avatar,
  Divider,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconMail,
  IconPhone,
  IconCalendarEvent,
  IconUserCircle,
  IconSchool,
  IconId,
  IconHash,
  IconRefresh,
  IconUsers
} from '@tabler/icons-react';
import { facultyAPI } from '../../utils/api';

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  registerNumber?: string;
  rollNumber?: string;
  year?: string | number;
  semester?: number;
  division?: string;
  batch?: string;
  department?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  profileImage?: string;
}

interface Class {
  _id: string;
  name: string;
  year: string | number;
  semester: number;
  division: string;
}

const Students: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedView, setSelectedView] = useState<'table' | 'cards'>('cards');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch classes
      const classesResponse = await facultyAPI.getClasses() as any;
      if (classesResponse.success && classesResponse.classes) {
        setClasses(classesResponse.classes);
      }
      // Fetch students from backend only
      const studentsResponse = await facultyAPI.getStudents() as any;
      if (studentsResponse.success && studentsResponse.students) {
        setStudents(studentsResponse.students);
        setFilteredStudents(studentsResponse.students);
        // Extract unique values for filters
        const uniqueYears = Array.from(new Set(studentsResponse.students.map((student: Student) => 
          student.year?.toString() || ''
        ))).filter(Boolean);
        const uniqueSemesters = Array.from(new Set(studentsResponse.students.map((student: Student) => 
          student.semester?.toString() || ''
        ))).filter(Boolean);
        const uniqueDivisions = Array.from(new Set(studentsResponse.students.map((student: Student) => 
          student.division || ''
        ))).filter(Boolean);
        setAvailableYears(uniqueYears as string[]);
        setAvailableSemesters(uniqueSemesters as string[]);
        setAvailableDivisions(uniqueDivisions as string[]);
      } else {
        setError('Failed to fetch students. Please try again.');
        showSnackbar('Failed to fetch students', 'error');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('An error occurred while fetching data. Please try again.');
      showSnackbar('Error fetching data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = [...students];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        student =>
          student.name.toLowerCase().includes(searchLower) ||
          student.email.toLowerCase().includes(searchLower) ||
          (student.registerNumber && student.registerNumber.toLowerCase().includes(searchLower)) ||
          (student.rollNumber && student.rollNumber.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply year filter
    if (selectedYear !== 'all') {
      result = result.filter(student => student.year?.toString() === selectedYear);
    }
    
    // Apply semester filter
    if (selectedSemester !== 'all') {
      result = result.filter(student => student.semester?.toString() === selectedSemester);
    }
    
    // Apply division filter
    if (selectedDivision !== 'all') {
      result = result.filter(student => student.division === selectedDivision);
    }
    
    // Apply class filter
    if (selectedClass !== 'all') {
      const selectedClassObj = classes.find(c => c._id === selectedClass);
      if (selectedClassObj) {
        result = result.filter(
          student => 
            student.year?.toString() === selectedClassObj.year.toString() &&
            student.semester?.toString() === selectedClassObj.semester.toString() &&
            student.division === selectedClassObj.division
        );
      }
    }
    
    // Apply sorting
    result.sort((a, b) => {
      // Handle undefined values
      if (sortField === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === 'registerNumber') {
        const aVal = a.registerNumber || '';
        const bVal = b.registerNumber || '';
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else if (sortField === 'year') {
        const aVal = a.year?.toString() || '';
        const bVal = b.year?.toString() || '';
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });
    
    setFilteredStudents(result);
  }, [
    students,
    search,
    selectedYear,
    selectedSemester,
    selectedDivision,
    selectedClass,
    sortField,
    sortOrder,
    classes
  ]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleYearChange = (event: SelectChangeEvent) => {
    setSelectedYear(event.target.value);
    setPage(0);
  };

  const handleSemesterChange = (event: SelectChangeEvent) => {
    setSelectedSemester(event.target.value);
    setPage(0);
  };

  const handleDivisionChange = (event: SelectChangeEvent) => {
    setSelectedDivision(event.target.value);
    setPage(0);
  };

  const handleClassChange = (event: SelectChangeEvent) => {
    setSelectedClass(event.target.value);
    setPage(0);
    
    // If a class is selected, update the other filters accordingly
    if (event.target.value !== 'all') {
      const selectedClassObj = classes.find(c => c._id === event.target.value);
      if (selectedClassObj) {
        setSelectedYear(selectedClassObj.year.toString());
        setSelectedSemester(selectedClassObj.semester.toString());
        setSelectedDivision(selectedClassObj.division);
      }
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleViewChange = (view: 'table' | 'cards') => {
    setSelectedView(view);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleViewTimetable = async (studentId: string) => {
    try {
      const response = await facultyAPI.getStudentTimetable(studentId);
      if (response.success && response.timetable) {
        // Navigate to timetable view with the student's timetable
        // For now just show a success message
        showSnackbar('Timetable fetched successfully', 'success');
      } else {
        showSnackbar('Failed to fetch student timetable', 'error');
      }
    } catch (error) {
      console.error('Error fetching student timetable:', error);
      showSnackbar('Error fetching student timetable', 'error');
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRandomColor = (name: string) => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
      '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', 
      '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
    ];
    
    // Simple hash function to generate a consistent color for the same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (isLoading) {
    return (
      <DashboardWrapper>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress />
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
            Students
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and view student information
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<IconRefresh size={18} />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3, p: 2 }}>
        <CardContent sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ width: { xs: '100%', sm: '48%', md: '23%' } }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Search students..."
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={20} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '48%', md: '18%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="class-select-label">Class</InputLabel>
                <Select
                  labelId="class-select-label"
                  value={selectedClass}
                  label="Class"
                  onChange={handleClassChange}
                >
                  <MenuItem value="all">All Classes</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls._id} value={cls._id}>
                      {cls.name || `${cls.year} - ${cls.division} (Sem ${cls.semester})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '31%', md: '15%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="year-select-label">Year</InputLabel>
                <Select
                  labelId="year-select-label"
                  value={selectedYear}
                  label="Year"
                  onChange={handleYearChange}
                  disabled={selectedClass !== 'all'}
                >
                  <MenuItem value="all">All Years</MenuItem>
                  {availableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      Year {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '31%', md: '15%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="semester-select-label">Semester</InputLabel>
                <Select
                  labelId="semester-select-label"
                  value={selectedSemester}
                  label="Semester"
                  onChange={handleSemesterChange}
                  disabled={selectedClass !== 'all'}
                >
                  <MenuItem value="all">All Semesters</MenuItem>
                  {availableSemesters.map((semester) => (
                    <MenuItem key={semester} value={semester}>
                      Semester {semester}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', sm: '31%', md: '15%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="division-select-label">Division</InputLabel>
                <Select
                  labelId="division-select-label"
                  value={selectedDivision}
                  label="Division"
                  onChange={handleDivisionChange}
                  disabled={selectedClass !== 'all'}
                >
                  <MenuItem value="all">All Divisions</MenuItem>
                  {availableDivisions.map((division) => (
                    <MenuItem key={division} value={division}>
                      Division {division}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '8%' }, display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton 
                onClick={() => handleViewChange('cards')}
                color={selectedView === 'cards' ? 'primary' : 'default'}
                sx={{ mr: 1 }}
              >
                <IconUsers size={20} />
              </IconButton>
              <IconButton 
                onClick={() => handleViewChange('table')}
                color={selectedView === 'table' ? 'primary' : 'default'}
              >
                <IconCalendarEvent size={20} />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {filteredStudents.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: '#f5f5f5' }}>
              <IconUsers size={40} color="#9e9e9e" />
            </Avatar>
            <Typography variant="h5" color="text.primary" sx={{ mb: 1, fontWeight: 'medium' }}>
              No students found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
              {search 
                ? `No students match the search "${search}"`
                : 'No students found with the selected filters. Try changing your filters or try again later.'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<IconRefresh size={18} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </Box>
        </Card>
      ) : selectedView === 'cards' ? (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {filteredStudents
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((student) => (
                <Box 
                  key={student._id} 
                  sx={{ 
                    width: { xs: '100%', sm: '48%', md: '31%', lg: '23%' },
                    mb: 1
                  }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: 6,
                        transform: 'translateY(-4px)'
                      },
                      cursor: 'pointer'
                    }}
                    onClick={() => handleStudentClick(student)}
                  >
                    <Box sx={{ 
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      {student.profileImage ? (
                        <Avatar 
                          src={student.profileImage} 
                          sx={{ 
                            width: 80, 
                            height: 80, 
                            mb: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }} 
                        />
                      ) : (
                        <Avatar 
                          sx={{ 
                            width: 80, 
                            height: 80, 
                            mb: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            bgcolor: getRandomColor(student.name),
                            fontSize: '1.75rem'
                          }}
                        >
                          {getInitials(student.name)}
                        </Avatar>
                      )}
                      
                      <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                        {student.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                        {student.registerNumber || student.rollNumber || 'No ID'}
                      </Typography>
                      
                      <Divider sx={{ width: '100%', mb: 2 }} />
                      
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 1,
                        width: '100%'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconMail size={16} style={{ minWidth: 24 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1, wordBreak: 'break-word' }}>
                            {student.email}
                          </Typography>
                        </Box>
                        
                        {student.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconPhone size={16} style={{ minWidth: 24 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              {student.phone}
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconSchool size={16} style={{ minWidth: 24 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {student.year ? `Year ${student.year}` : ''} 
                            {student.semester ? `, Sem ${student.semester}` : ''} 
                            {student.division ? `, Div ${student.division}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-around',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      p: 1
                    }}>
                      <Button 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTimetable(student._id);
                        }}
                        startIcon={<IconCalendarEvent size={16} />}
                      >
                        Timetable
                      </Button>
                    </Box>
                  </Card>
                </Box>
              ))}
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <TablePagination
              component="div"
              count={filteredStudents.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Box>
        </>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'primary.light' }}>
                <TableRow>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        color: 'white',
                        fontWeight: 'bold' 
                      }}
                      onClick={() => handleSort('name')}
                    >
                      Name
                      {sortField === 'name' && (
                        sortOrder === 'asc' ? 
                          <IconSortAscending size={18} style={{ marginLeft: 4 }} /> : 
                          <IconSortDescending size={18} style={{ marginLeft: 4 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      onClick={() => handleSort('registerNumber')}
                    >
                      Register Number
                      {sortField === 'registerNumber' && (
                        sortOrder === 'asc' ? 
                          <IconSortAscending size={18} style={{ marginLeft: 4 }} /> : 
                          <IconSortDescending size={18} style={{ marginLeft: 4 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                      onClick={() => handleSort('year')}
                    >
                      Class Details
                      {sortField === 'year' && (
                        sortOrder === 'asc' ? 
                          <IconSortAscending size={18} style={{ marginLeft: 4 }} /> : 
                          <IconSortDescending size={18} style={{ marginLeft: 4 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((student) => (
                    <TableRow 
                      key={student._id}
                      hover
                      onClick={() => handleStudentClick(student)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {student.profileImage ? (
                            <Avatar src={student.profileImage} sx={{ mr: 2, width: 36, height: 36 }} />
                          ) : (
                            <Avatar 
                              sx={{ 
                                mr: 2, 
                                width: 36, 
                                height: 36, 
                                bgcolor: getRandomColor(student.name),
                                fontSize: '0.875rem'
                              }}
                            >
                              {getInitials(student.name)}
                            </Avatar>
                          )}
                          <Typography variant="body1" fontWeight={500}>
                            {student.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{student.registerNumber || student.rollNumber || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconSchool size={14} style={{ marginRight: 4 }} />
                            <Typography variant="body2">
                              {student.year ? `Year ${student.year}` : ''}
                              {student.semester ? `, Sem ${student.semester}` : ''}
                            </Typography>
                          </Box>
                          {student.division && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <IconUserCircle size={14} style={{ marginRight: 4 }} />
                              <Typography variant="body2">Division {student.division}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<IconCalendarEvent size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTimetable(student._id);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Timetable
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={filteredStudents.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </>
      )}
    </DashboardWrapper>
  );
};

export default Students; 