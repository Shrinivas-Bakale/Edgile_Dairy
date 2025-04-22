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
