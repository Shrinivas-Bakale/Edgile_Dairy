const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const logger = require("../utils/logger");

// Middleware to log every request
router.use((req, res, next) => {
    console.log(`➡️ Incoming request: ${req.method} ${req.originalUrl}`);
    console.log('Request body:', req.body);
    next();
});

/**
 * @route   POST /universities/verify-code
 * @desc    Verify university code
 * @access  Public
 */
router.post("/verify-code", async (req, res) => {
    try {
        console.log("Verify university code request received:", req.body);
        
        const { code } = req.body;

        if (!code) {
            console.log("❌ University code is missing in request");
            return res.status(400).json({
                success: false,
                message: "University code is required"
            });
        }

        console.log(`🔍 Searching for university code: ${code}`);
        
        // Look for the university by code (case insensitive)
        const university = await Admin.findOne({ 
            universityCode: { $regex: new RegExp('^' + code + '$', 'i') }
        });
        
        console.log("🔍 University search result:", university ? "Found" : "Not found");
        
        if (!university) {
            console.log(`❌ Invalid university code: ${code}`);
            
            // For debugging, list all available codes in development
            if (process.env.NODE_ENV === 'development') {
                const allCodes = await Admin.find({}, 'universityCode universityName');
                console.log("Available university codes:", allCodes);
            }
            
            return res.status(404).json({
                success: false,
                message: "Invalid or expired university code",
                verified: false
            });
        }

        console.log(`✅ University code verified successfully: ${code} -> ${university.universityName}`);
        
        // Return success with university details
        return res.status(200).json({
            success: true,
            message: "University code verified successfully",
            verified: true,
            universityName: university.universityName,
            universityId: university._id
        });
    } catch (error) {
        console.error("Error verifying university code:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

module.exports = router; 