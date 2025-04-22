const RegistrationLog = require('../models/RegistrationLog');
const Admin = require('../models/Admin');
const logger = require('./logger');

/**
 * Create a log entry for student/faculty registration
 * @param {Object} data - Registration data
 */
const createRegistrationLog = async (data) => {
  try {
    // Create the log entry
    const log = new RegistrationLog(data);
    await log.save();
    
    logger.info(`Registration: ${data.userRole} ${data.userName} (${data.userEmail}) at ${data.universityName}`);
    return log;
  } catch (error) {
    // Log error but don't throw
    logger.error(`Failed to create registration log: ${error.message}`, {
      error: error.stack,
      data
    });
    return null;
  }
};

/**
 * Log a faculty registration
 * @param {Object} faculty - Faculty object
 * @param {Object} admin - Admin who registered the faculty
 * @param {String} method - Registration method
 */
const logFacultyRegistration = async (faculty, admin, method = 'admin-created') => {
  try {
    // If admin is just an ID, fetch the complete admin
    let adminData = admin;
    if (typeof admin === 'string' || admin instanceof require('mongoose').Types.ObjectId) {
      adminData = await Admin.findById(admin);
      if (!adminData) {
        logger.error(`Failed to log faculty registration: Admin not found with ID ${admin}`);
        return null;
      }
    }
    
    const data = {
      userId: faculty._id,
      userModel: 'Faculty',
      userName: faculty.name,
      userEmail: faculty.email,
      userRole: 'faculty',
      employeeId: faculty.employeeId,
      department: faculty.department,
      universityId: adminData._id,
      universityName: adminData.universityName || 'Unknown University',
      universityCode: adminData.universityCode,
      registeredBy: 'admin',
      registrationMethod: method,
      status: faculty.status || 'active'
    };
    
    return await createRegistrationLog(data);
  } catch (error) {
    logger.error(`Failed to log faculty registration: ${error.message}`);
    return null;
  }
};

/**
 * Log a student registration
 * @param {Object} student - Student object
 * @param {Object} admin - Admin who registered the student (or university data)
 * @param {String} method - Registration method
 */
const logStudentRegistration = async (student, admin, method = 'self-registration') => {
  try {
    // If admin is just an ID, fetch the complete admin
    let adminData = admin;
    if (typeof admin === 'string' || admin instanceof require('mongoose').Types.ObjectId) {
      adminData = await Admin.findById(admin);
      if (!adminData) {
        logger.error(`Failed to log student registration: Admin not found with ID ${admin}`);
        return null;
      }
    }
    
    const data = {
      userId: student._id,
      userModel: 'Student',
      userName: student.name,
      userEmail: student.email,
      userRole: 'student',
      registerNumber: student.registerNumber,
      semester: student.semester,
      division: student.division,
      year: student.year,
      universityId: adminData._id,
      universityName: adminData.universityName || 'Unknown University',
      universityCode: adminData.universityCode,
      registeredBy: method === 'self-registration' ? 'self' : 'admin',
      registrationMethod: method,
      status: student.status || 'active'
    };
    
    return await createRegistrationLog(data);
  } catch (error) {
    logger.error(`Failed to log student registration: ${error.message}`);
    return null;
  }
};

/**
 * Get latest registrations
 * @param {String} universityId - University ID
 * @param {Number} limit - Number of records to fetch
 */
const getLatestRegistrations = async (universityId, limit = 5) => {
  try {
    return await RegistrationLog.find({ universityId })
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    logger.error(`Failed to get latest registrations: ${error.message}`);
    return [];
  }
};

/**
 * Get latest faculty and student registrations
 * @param {String} universityId - University ID
 */
const getLatestRegistrationsByRole = async (universityId) => {
  try {
    const latestFaculty = await RegistrationLog.findOne({ 
      universityId, 
      userRole: 'faculty' 
    }).sort({ createdAt: -1 });
    
    const latestStudent = await RegistrationLog.findOne({ 
      universityId, 
      userRole: 'student' 
    }).sort({ createdAt: -1 });
    
    return { 
      faculty: latestFaculty, 
      student: latestStudent 
    };
  } catch (error) {
    logger.error(`Failed to get latest role registrations: ${error.message}`);
    return { faculty: null, student: null };
  }
};

module.exports = {
  createRegistrationLog,
  logFacultyRegistration,
  logStudentRegistration,
  getLatestRegistrations,
  getLatestRegistrationsByRole
}; 