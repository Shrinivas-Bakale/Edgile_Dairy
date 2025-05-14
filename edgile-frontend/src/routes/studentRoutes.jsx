import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useStudentAuth } from '../contexts/StudentAuthContext';

import StudentDashboard from '../pages/student/Dashboard';
import StudentProfile from '../pages/student/Profile';
import AttendanceView from '../pages/student/attendance/AttendanceView';
import CalendarView from '../pages/student/attendance/CalendarView';
import StudentAttendance from '../pages/student/attendance';
import StudentLayout from '../layouts/StudentLayout';

const StudentRoutes = () => {
  const { student, token } = useStudentAuth();

  if (!student || !token) {
    return <Navigate to="/student/login" />;
  }

  return (
    <StudentLayout>
      <Routes>
        <Route path="/" element={<StudentDashboard />} />
        <Route path="/profile" element={<StudentProfile />} />
        
        {/* Attendance routes */}
        <Route path="/attendance" element={<StudentAttendance />} />
        <Route path="/attendance/view" element={<AttendanceView />} />
        <Route path="/attendance/calendar" element={<CalendarView />} />
        
        {/* Default route for any other paths */}
        <Route path="*" element={<Navigate to="/student" />} />
      </Routes>
    </StudentLayout>
  );
};

export default StudentRoutes; 