const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  sendMessage,
  getMessagesForGroup,
  getMessagesForStudent,
  pinMessage,
  addReaction,
  removeReaction,
  markMessageAsRead,
  deleteMessage,
} = require("../controllers/messageController");

const router = express.Router();

router.post("/send", protect, upload.single("file"), sendMessage); // ✅ Accepts file uploads
router.get("/group/:groupId", protect, getMessagesForGroup);
router.get("/student/:studentId", protect, getMessagesForStudent);
router.put("/:messageId/pin", protect, pinMessage);
router.put("/:messageId/react", protect, addReaction);
router.put("/:messageId/unreact", protect, removeReaction);
router.put("/:messageId/read", protect, markMessageAsRead);
router.delete("/:messageId", protect, deleteMessage);

module.exports = router;
