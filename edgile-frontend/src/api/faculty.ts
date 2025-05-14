import axios from 'axios';
import { API_BASE_URL } from '../config';

const facultyAPI = {
  getStudents: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/faculty/students`);
    return response.data;
  },

  getClasses: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/faculty/classes`);
    return response.data;
  },

  getStudentTimetable: async (studentId: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/faculty/students/${studentId}/timetable`);
    return response.data;
  },

  getAttendance: async (classId: string, date: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/faculty/attendance`, {
      params: { classId, date }
    });
    return response.data;
  },

  markAttendance: async (classId: string, date: string, attendanceData: any) => {
    const response = await axios.post(`${API_BASE_URL}/api/faculty/attendance`, {
      classId,
      date,
      attendanceData
    });
    return response.data;
  },

  getAttendanceReports: async (filters: any) => {
    const response = await axios.get(`${API_BASE_URL}/api/faculty/attendance/reports`, {
      params: filters
    });
    return response.data;
  },

  downloadAttendanceReport: async (filters: any) => {
    const response = await axios.get(`${API_BASE_URL}/api/faculty/attendance/reports/download`, {
      params: filters,
      responseType: 'blob'
    });
    return response;
  }
};

export { facultyAPI }; 