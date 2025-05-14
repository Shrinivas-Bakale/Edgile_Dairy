import axios from 'axios';
import { API_BASE_URL } from '../config';

const studentAPI = {
  getAttendance: async (month: string) => {
    const response = await axios.get(`${API_BASE_URL}/api/student/attendance`, {
      params: { month }
    });
    return response.data;
  },

  getTimetable: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/student/timetable`);
    return response.data;
  },

  getCourses: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/student/courses`);
    return response.data;
  },

  getProfile: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/student/profile`);
    return response.data;
  },

  updateProfile: async (profileData: any) => {
    const response = await axios.put(`${API_BASE_URL}/api/student/profile`, profileData);
    return response.data;
  }
};

export { studentAPI }; 