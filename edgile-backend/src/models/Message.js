const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderType", // Can be "Admin" or "Faculty"
      required: true,
    },
    senderType: {
      type: String,
      enum: ["Admin", "Faculty"],
      required: true,
    },
    content: { type: String, required: true }, // Message text
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: false }, // If sent in a group
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: false }, // If sent to a student
    pinned: { type: Boolean, default: false }, // Pinned messages won't be deleted
  },
  { timestamps: true }
);

// ✅ Auto-delete messages after 3 months unless pinned
messageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000, partialFilterExpression: { pinned: false } }
);

module.exports = mongoose.model("Message", messageSchema);
