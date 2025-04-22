const { admin } = require("../config/firebase");
const db = admin.firestore();
const Group = require("../models/Group");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

exports.sendMessage = async (req, res) => {
  try {
    const { groupId, recipientId, text } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;
    const file = req.file; // Uploaded file (if any)

    if (!text && !file)
      return res.status(400).json({ message: "Message or file is required." });
    if (!["admin", "faculty"].includes(senderRole)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to send messages." });
    }

    const message = {
      senderId,
      senderRole,
      text: text || "",
      timestamp: new Date(),
      status: "sent",
      reactions: {},
      readBy: [],
      unread: true,
      attachment: null,
    };

    // 📌 Handle File Upload
    if (file) {
      const fileName = `uploads/${Date.now()}_${file.originalname}`;
      const bucket = admin.storage().bucket();
      const fileUpload = bucket.file(fileName);

      await fileUpload.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });
      await fileUpload.makePublic(); // 🔥 Makes file accessible

      // ✅ Use Public URL Format
      const url = fileUpload.publicUrl(); // 🔥 Get public URL
      message.attachment = { url, fileName: file.originalname };
    }

    // 📌 Store Message in Firestore
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group) return res.status(404).json({ message: "Group not found." });
      message.groupId = groupId;
    } else if (recipientId) {
      const student = await Student.findById(recipientId);
      if (!student)
        return res.status(404).json({ message: "Student not found." });
      message.recipientId = recipientId;
    } else {
      return res
        .status(400)
        .json({ message: "Either groupId or recipientId is required." });
    }

    const messageRef = await db.collection("messages").add(message);
    return res.status(200).json({
      success: true,
      message: "Message sent successfully.",
      messageId: messageRef.id,
      status: "sent",
      attachment: message.attachment || null,
    });
  } catch (error) {
    console.error("🔥 Error Sending Message:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error sending message." });
  }
};

// 📌 Mark Message as Read (Updated)
exports.markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const messageRef = db.collection("messages").doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists)
      return res.status(404).json({ message: "Message not found." });

    const messageData = messageDoc.data();
    const updatedReadBy = [...messageData.readBy, userId];

    // ✅ Update `unread` to `false` if all expected recipients have read it
    const isFullyRead =
      messageData.recipientId &&
      updatedReadBy.includes(messageData.recipientId);

    await messageRef.update({
      readBy: admin.firestore.FieldValue.arrayUnion(userId),
      unread: isFullyRead ? false : true,
    });

    return res
      .status(200)
      .json({ success: true, message: "Message marked as read." });
  } catch (error) {
    logger.error("🔥 Error Marking Message as Read:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating read status." });
  }
};

// 📌 Get Messages for a Group (Updated)
exports.getMessagesForGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // ✅ Validate Group Exists
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found." });

    let isMember = false;

    if (userRole === "admin") {
      isMember = true; // ✅ Admin can access all groups
    } else if (userRole === "faculty") {
      isMember = group.faculty.some((id) => id.equals(userId)); // ✅ Faculty must be in group
    } else if (userRole === "student") {
      // ✅ Convert Student Reg. No. to ObjectId
      const student = await Student.findOne({ registerNumber: userId }); // 🔹 Match by reg. no.
      if (!student)
        return res.status(404).json({ message: "Student not found." });

      isMember = group.members.some((id) => id.equals(student._id)); // 🔹 Compare ObjectId
    }

    if (!isMember)
      return res.status(403).json({
        message: "Access denied. You are not a member of this group.",
      });

    // ✅ Fetch messages for the group
    const messagesSnapshot = await db
      .collection("messages")
      .where("groupId", "==", groupId)
      .orderBy("timestamp", "asc")
      .get();

    let messages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        unread: !(data.readBy && data.readBy.includes(userId)), // ✅ Fix: Handle undefined `readBy`
      };
    });

    if (userRole === "student") {
      messages = messages.map(({ status, ...rest }) => rest); // ✅ Hide status for students
    }

    // ✅ Batch update message status to "delivered"
    const batch = db.batch();
    messagesSnapshot.docs.forEach((msg) => {
      const msgRef = db.collection("messages").doc(msg.id);
      batch.update(msgRef, { status: "delivered" });
    });
    await batch.commit();

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    logger.error("🔥 Error Fetching Group Messages:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching messages." });
  }
};

// 📌 Get Messages for a Specific Student
exports.getMessagesForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student)
      return res.status(404).json({ message: "Student not found." });

    const messagesSnapshot = await db
      .collection("messages")
      .where("recipientId", "==", studentId)
      .orderBy("timestamp", "asc")
      .get();

    let messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // ✅ Batch update message status to "delivered"
    const batch = db.batch();
    messagesSnapshot.docs.forEach((msg) => {
      const msgRef = db.collection("messages").doc(msg.id);
      batch.update(msgRef, { status: "delivered" });
    });
    await batch.commit();

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    logger.error("🔥 Error Fetching Student Messages:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching messages." });
  }
};

// 📌 Pin a Message (Admin/Faculty Only)
exports.pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const messageRef = db.collection("messages").doc(messageId);

    const messageDoc = await messageRef.get();
    if (!messageDoc.exists)
      return res.status(404).json({ message: "Message not found." });

    if (messageDoc.data().pinned) {
      return res.status(400).json({ message: "Message is already pinned." });
    }

    await messageRef.update({ pinned: true });

    return res
      .status(200)
      .json({ success: true, message: "Message pinned successfully." });
  } catch (error) {
    logger.error("🔥 Error Pinning Message:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error pinning message." });
  }
};

// 📌 Add Reaction to a Message (Only Students)
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can react to messages." });
    }

    const messageRef = db.collection("messages").doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists)
      return res.status(404).json({ message: "Message not found." });

    await messageRef.update({
      [`reactions.${userId}`]: emoji,
    });

    return res
      .status(200)
      .json({ success: true, message: "Reaction added successfully." });
  } catch (error) {
    logger.error("🔥 Error Adding Reaction:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error adding reaction." });
  }
};

// 📌 Remove Reaction from a Message
exports.removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const messageRef = db.collection("messages").doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists)
      return res.status(404).json({ message: "Message not found." });

    await messageRef.update({
      [`reactions.${userId}`]: admin.firestore.FieldValue.delete(),
    });

    return res
      .status(200)
      .json({ success: true, message: "Reaction removed successfully." });
  } catch (error) {
    logger.error("🔥 Error Removing Reaction:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error removing reaction." });
  }
};

// 📌 Delete Message (Sender: 10 min limit, Admin: Anytime)
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role; // ✅ Check if user is admin

    const messageRef = db.collection("messages").doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists)
      return res.status(404).json({ message: "Message not found." });

    const messageData = messageDoc.data();
    const messageTime = messageData.timestamp._seconds * 1000; // Convert Firestore timestamp to ms
    const now = Date.now();
    const timeDiff = now - messageTime;

    // ✅ Allow admin to delete at any time
    if (userRole === "admin") {
      await messageRef.delete();
      return res
        .status(200)
        .json({ success: true, message: "Message deleted by admin." });
    }

    // ✅ Sender can delete only within 10 minutes
    if (messageData.senderId === userId) {
      if (timeDiff <= 600000) {
        await messageRef.delete();
        return res
          .status(200)
          .json({ success: true, message: "Message deleted successfully." });
      } else {
        return res.status(400).json({
          message: "Time limit exceeded! You can't delete this message.",
        });
      }
    }

    return res
      .status(403)
      .json({ message: "You are not authorized to delete this message." });
  } catch (error) {
    logger.error("🔥 Error Deleting Message:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error deleting message." });
  }
};
