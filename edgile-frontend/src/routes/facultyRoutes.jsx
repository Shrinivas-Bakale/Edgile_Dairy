import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useFacultyAuth } from '../contexts/FacultyAuthContext';

import FacultyDashboard from '../pages/faculty/Dashboard';
import FacultyProfile from '../pages/faculty/Profile';
import Attendance from '../pages/faculty/attendance';
import MarkAttendance from '../pages/faculty/attendance/MarkAttendance';
import DailyRecords from '../pages/faculty/attendance/DailyRecords';
import AttendanceStats from '../pages/faculty/attendance/AttendanceStats';
import AbsenteesTracking from '../pages/faculty/attendance/Absentees';
import AttendanceReports from '../pages/faculty/attendance/reports';
import FacultyLayout from '../layouts/FacultyLayout';

const FacultyRoutes = () => {
  const { isAuthenticated } = useFacultyAuth();

  if (!isAuthenticated) {
    return <Navigate to="/faculty/login" />;
  }

  return (
    <FacultyLayout>
      <Routes>
        <Route path="/" element={<FacultyDashboard />} />
        <Route path="/profile" element={<FacultyProfile />} />
        
        {/* Attendance routes */}
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/attendance/mark" element={<MarkAttendance />} />
        <Route path="/attendance/daily" element={<DailyRecords />} />
        <Route path="/attendance/stats" element={<AttendanceStats />} />
        <Route path="/attendance/absentees" element={<AbsenteesTracking />} />
        <Route path="/attendance/reports" element={<AttendanceReports />} />
        
        {/* Default route for any other paths */}
        <Route path="*" element={<Navigate to="/faculty" />} />
      </Routes>
    </FacultyLayout>
  );
};

export default FacultyRoutes; 