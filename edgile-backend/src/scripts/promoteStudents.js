const mongoose = require("mongoose");
const Student = require("../models/Student");
const connectDB = require("../config/db");
const logger = require("../utils/logger");

connectDB();

const promoteStudents = async () => {
  try {
    logger.info("🚀 Running Student Promotion Script...");

    const students = await Student.find({ status: "active" });

    for (let student of students) {
      if (student.semester >= 6) {
        student.status = "graduated";
        logger.info(
          `🎓 Student Graduated: ${student.name} (${student.registerNumber})`
        );
      } else {
        student.semester += 1;
        logger.info(
          `✅ Promoted: ${student.name} to Semester ${student.semester}`
        );
      }
      await student.save();
    }

    logger.info("✅ Student Promotion Completed.");
    process.exit();
  } catch (error) {
    logger.error("🔥 Error Promoting Students:", error);
    process.exit(1);
  }
};

promoteStudents();
