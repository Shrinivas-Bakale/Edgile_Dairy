const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); 
const Admin = require("../models/Admin");
const Faculty = require("../models/Faculty");
const logger = require("../utils/logger");

// ✅ Password validation function (Raw Password Validation)
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      logger.warn("❌ Validation Error: Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validatePassword(password)) {
      logger.warn("❌ Validation Error: Password does not meet criteria");
      return res.status(400).json({
        message: "Password must include uppercase, lowercase, number, and special character.",
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      logger.warn("❌ Validation Error: Admin already exists");
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({ name, email, password: hashedPassword });

    await newAdmin.save();
    logger.info(`✅ Admin Created Successfully: ${newAdmin.email}`);

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    logger.error("🔥 ERROR - Admin Register Failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Toggle Faculty Status (Activate/Deactivate)
exports.toggleFacultyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Incoming Request: Toggle Status for Faculty ID: ${id}`);

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      logger.warn("❌ Faculty not found in DB!");
      return res.status(404).json({ message: "Faculty not found" });
    }

    faculty.status = faculty.status === "active" ? "inactive" : "active";
    await faculty.save();

    logger.info(`✅ Faculty status updated: ${faculty.email} is now ${faculty.status}`);
    res.status(200).json({ message: `Faculty status updated to ${faculty.status}` });
  } catch (error) {
    logger.error("🔥 Error updating faculty status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Promote students in a batch (year, semester) to next semester/year or graduate
exports.promoteStudents = async (req, res) => {
  try {
    const { year, semester } = req.body;
    if (!year || !semester) {
      return res.status(400).json({ message: 'Year and semester are required.' });
    }
    // Find all active students in the given year and semester
    const students = await require('../models/Student').find({
      classYear: Number(year),
      semester: Number(semester),
      status: 'active',
    });
    const updated = [];
    
    // Get current time for tracking when promotion happened
    const promotionTime = new Date();
    
    for (let student of students) {
      // Save previous state for potential undo
      student.previousClassYear = student.classYear;
      student.previousSemester = student.semester;
      student.previousStatus = student.status;
      
      if (student.semester === 6 && student.classYear === 3) {
        student.status = 'graduated';
      } else if (student.semester % 2 === 0) {
        student.classYear += 1;
        student.semester += 1;
      } else {
        student.semester += 1;
      }
      
      // Record when this promotion happened
      student.lastPromotedAt = promotionTime;
      
      await student.save();
      updated.push(student);
    }
    res.status(200).json({ message: 'Promotion completed.', updated });
  } catch (error) {
    console.error('Error promoting students:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Undo the most recent promotion for students
exports.undoPromotion = async (req, res) => {
  console.log('undoPromotion controller called with data:', req.body);
  try {
    const { year, semester } = req.body;
    console.log(`Undoing promotion for Year: ${year}, Semester: ${semester}`);
    
    if (!year || !semester) {
      console.log('Missing year or semester in request body');
      return res.status(400).json({ message: 'Year and semester are required.' });
    }
    
    const Student = require('../models/Student');
    console.log('Student model imported successfully');
    
    // Calculate cutoff time - only undo promotions from the last 24 hours
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);
    console.log(`Using cutoff time: ${cutoffTime.toISOString()}`);
    
    // Find all recently promoted students based on their current state
    console.log('Constructing query for recently promoted students...');
    
    // Find all recently promoted students based on their current state
    // For regular semester promotion, look one semester ahead
    // For graduated students, look at Year 3 Semester 6 with graduated status
    const recentlyPromoted = await Student.find({
      $or: [
        // Students who were promoted to the next semester/year
        {
          $or: [
            // Within same year, semester+1
            { classYear: Number(year), semester: Number(semester) + 1 },
            // To next year, semester from 6->1, 4->5, 2->3
            { classYear: Number(year) + 1, semester: Number(semester) % 2 === 0 ? 1 : Number(semester) + 1 }
          ],
          lastPromotedAt: { $gte: cutoffTime }
        },
        // Students who were graduated (special case)
        {
          status: 'graduated',
          previousClassYear: 3,
          previousSemester: 6,
          lastPromotedAt: { $gte: cutoffTime }
        }
      ]
    });
    
    console.log(`Found ${recentlyPromoted.length} recently promoted students`);
    
    if (recentlyPromoted.length === 0) {
      console.log('No recently promoted students found to undo');
      return res.status(200).json({ 
        success: true,
        message: 'No recent promotions found to undo.',
        undone: []
      });
    }
    
    const undone = [];
    
    for (let student of recentlyPromoted) {
      console.log(`Processing student: ${student.name} (ID: ${student._id})`);
      // Restore previous state
      if (student.previousClassYear && student.previousSemester && student.previousStatus) {
        console.log(`Reverting student from Y${student.classYear}S${student.semester} back to Y${student.previousClassYear}S${student.previousSemester}`);
        
        student.classYear = student.previousClassYear;
        student.semester = student.previousSemester;
        student.status = student.previousStatus;
        
        // Clear the promotion tracking fields
        student.previousClassYear = undefined;
        student.previousSemester = undefined;
        student.previousStatus = undefined;
        student.lastPromotedAt = undefined;
        
        await student.save();
        undone.push(student);
        console.log(`Student ${student.name} successfully reverted`);
      } else {
        console.log(`Student ${student.name} has no previous state data, skipping`);
      }
    }
    
    console.log(`Successfully undid promotion for ${undone.length} students`);
    res.status(200).json({ 
      message: `Successfully undid promotion for ${undone.length} students.`, 
      undone 
    });
  } catch (error) {
    console.error('Error undoing student promotion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
