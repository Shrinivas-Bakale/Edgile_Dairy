const Student = require("../models/Student");
const mongoose = require("mongoose");

// 📌 Get All Students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().select("-otp -otpExpires");
    res.status(200).json(students);
  } catch (error) {
    console.error("🔥 Error Fetching Students:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📌 Register a New Student (Stores as ObjectId)
exports.registerStudent = async (req, res) => {
  try {
    const {
      registerNumber,
      name,
      email,
      phone,
      classYear,
      semester,
      division,
    } = req.body;

    const existingStudent = await Student.findOne({ registerNumber });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already registered." });
    }

    const student = new Student({
      _id: new mongoose.Types.ObjectId(), // ✅ Generate ObjectId for Student
      registerNumber,
      name,
      email,
      phone,
      classYear,
      semester,
      division,
    });

    await student.save();
    return res
      .status(201)
      .json({ success: true, message: "Student registered successfully." });
  } catch (error) {
    console.error("🔥 Error Registering Student:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error registering student." });
  }
};

// 📌 Get Student by Register Number (For Login & Profile)
exports.getStudentByRegisterNumber = async (req, res) => {
  try {
    const { registerNumber } = req.params;
    const student = await Student.findOne({ registerNumber });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    console.error("🔥 Error Fetching Student:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
