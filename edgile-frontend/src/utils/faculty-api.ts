import api from './api';

/**
 * Faculty Attendance API Service
 * Provides all API functions related to faculty attendance
 */
export class FacultyAttendanceService {
  /**
   * Get attendance statistics for a specific date
   */
  async getAttendanceStats(date: string, classId: string) {
    return api.get('/api/faculty/attendance/stats', { date, classId });
  }

  /**
   * Get faculty classes
   */
  async getClasses() {
    return api.get('/api/faculty/classes');
  }

  /**
   * Get subjects for a specific class
   */
  async getSubjects(classId: string) {
    return api.get('/api/faculty/subjects', { classId });
  }

  /**
   * Get students for a specific class
   */
  async getStudents(classId: string) {
    return api.get('/api/faculty/students', { classId });
  }

  /**
   * Get attendance records for a class on a specific date and slot
   */
  async getAttendanceRecords(classId: string, subjectId: string, date: string, slotNumber: string) {
    return api.get('/api/faculty/attendance/class', { 
      classId, 
      subjectId, 
      date, 
      slotNumber 
    });
  }

  /**
   * Get faculty timetable for a specific day
   */
  async getTimetable(day: string) {
    return api.get('/api/faculty/timetable', { day });
  }

  /**
   * Check if a date is a holiday
   */
  async checkHoliday(date: string) {
    return api.get('/api/faculty/holidays', { date });
  }

  /**
   * Mark attendance for a class
   */
  async markAttendance(data: {
    class: string;
    subject: string;
    date: string;
    slotNumber: number;
    attendanceRecords: Array<{
      student: string;
      status: string;
      reason?: string;
      recordId?: string;
    }>;
  }) {
    return api.post('/api/faculty/attendance/mark', data);
  }

  /**
   * Mark a class as cancelled
   */
  async cancelClass(data: {
    classId: string;
    subjectId: string;
    date: string;
    slotNumber: string;
    reason: string;
  }) {
    return api.post('/api/faculty/attendance/cancel-class', data);
  }

  /**
   * Get absentee reports
   */
  async getAbsenteeReports(params: {
    classId?: string;
    subjectId?: string;
    startDate?: string;
    endDate?: string;
    threshold?: number;
  }) {
    // Convert number parameters to strings for the API request
    const apiParams: Record<string, string> = {};
    
    if (params.classId) apiParams.classId = params.classId;
    if (params.subjectId) apiParams.subjectId = params.subjectId;
    if (params.startDate) apiParams.startDate = params.startDate;
    if (params.endDate) apiParams.endDate = params.endDate;
    if (params.threshold !== undefined) apiParams.threshold = params.threshold.toString();
    
    return api.get('/api/faculty/attendance/absentees', apiParams);
  }

  /**
   * Get attendance statistics over time
   */
  async getAttendanceStatistics(params: {
    classId?: string;
    subjectId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return api.get('/api/faculty/attendance/statistics', params);
  }

  /**
   * Generate attendance reports
   */
  async getAttendanceReports(params: {
    classId?: string;
    subjectId?: string;
    startDate?: string;
    endDate?: string;
    format?: string;
  }) {
    return api.get('/api/faculty/attendance/reports', params);
  }

  /**
   * Get daily attendance records
   */
  async getDailyRecords(params: {
    date: string;
    classId?: string;
    subjectId?: string;
  }) {
    return api.get('/api/faculty/attendance/daily', params);
  }
}

// Create a singleton instance
const facultyAttendanceApi = new FacultyAttendanceService();

export default facultyAttendanceApi; 