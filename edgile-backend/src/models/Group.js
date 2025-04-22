const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["class", "event"], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByType: { type: String, enum: ["admin", "faculty"], required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // ✅ Store students as ObjectId
    faculty: [{ type: mongoose.Schema.Types.ObjectId, ref: "Faculty" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);
