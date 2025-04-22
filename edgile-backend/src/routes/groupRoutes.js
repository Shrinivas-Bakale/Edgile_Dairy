const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  createGroup,
  getAllGroups,
  getGroupById,
  addMembersToGroup,
  removeMembersFromGroup,
  deleteGroup,
} = require("../controllers/groupController");

const router = express.Router();

// Middleware to allow both Admin & Faculty
const adminOrFaculty = (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "faculty") {
    return next();
  }
  return res.status(403).json({ message: "Unauthorized" });
};

// 📌 Create a New Group (Admin/Faculty)
router.post("/create", protect, adminOrFaculty, createGroup);

// 📌 Get All Groups (Admin/Faculty)
router.get("/all", protect, adminOrFaculty, getAllGroups);

// 📌 Get a Single Group by ID (Admin/Faculty)
router.get("/:groupId", protect, adminOrFaculty, getGroupById);

// 📌 Add Members to a Group (Admin/Faculty)
router.post("/:groupId/add-members", protect, adminOrFaculty, addMembersToGroup);

// 📌 Remove Members from a Group (Admin/Faculty)
router.delete("/:groupId/remove-members", protect, adminOrFaculty, removeMembersFromGroup);

// 📌 Delete a Group (Admin Only)
router.delete("/:groupId", protect, adminOnly, deleteGroup);

module.exports = router;
