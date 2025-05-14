import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AttendanceIndex from './index';
import MarkAttendance from './MarkAttendance';
import DailyRecords from './DailyRecords';
import AttendanceStats from './AttendanceStats';
import Absentees from './Absentees';
import Reports from './reports';

const FacultyAttendancePage = () => {
  return (
    <Routes>
      <Route path="/" element={<AttendanceIndex />} />
      <Route path="/mark" element={<MarkAttendance />} />
      <Route path="/daily" element={<DailyRecords />} />
      <Route path="/stats" element={<AttendanceStats />} />
      <Route path="/absentees" element={<Absentees />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="*" element={<Navigate to="/faculty/attendance" replace />} />
    </Routes>
  );
};

export default FacultyAttendancePage; 