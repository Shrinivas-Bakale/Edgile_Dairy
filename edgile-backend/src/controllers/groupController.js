const Group = require("../models/Group");
const Faculty = require("../models/Faculty");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

// 📌 Create Group (Admin/Faculty)
exports.createGroup = async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      return res
        .status(400)
        .json({ message: "Group name and type are required" });
    }

    const createdByType = req.user.role;

    const newGroup = new Group({
      name,
      type,
      createdBy: req.user.id,
      createdByType,
    });

    await newGroup.save();
    res
      .status(201)
      .json({ message: "Group created successfully", group: newGroup });
  } catch (error) {
    logger.error("🔥 Error Creating Group:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 📌 Get All Groups
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate("createdBy", "name email")
      .populate("faculty", "name email");

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// 📌 Get a Single Group by ID
exports.getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate(
      "faculty",
      "name email"
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// 📌 Add Members to a Group (Admin/Faculty)
exports.addMembersToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { facultyIds = [] } = req.body;

    // ✅ Validate Group ID
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // ✅ Validate Faculty IDs
    const validFaculty = await Faculty.find({ _id: { $in: facultyIds } });
    const foundFacultyIds = validFaculty.map((f) => f._id.toString());

    // ✅ Fetch Existing Members
    const existingFacultyIds = group.faculty.map((id) => id.toString());

    // ✅ Filter only new members
    const newFacultyIds = foundFacultyIds.filter(
      (id) => !existingFacultyIds.includes(id.toString())
    );

    if (newFacultyIds.length === 0) {
      return res
        .status(400)
        .json({ message: "All members are already in the group" });
    }

    // ✅ Add Members Using `$addToSet` (Prevents Duplicates)
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        $addToSet: {
          faculty: { $each: newFacultyIds },
        },
      },
      { new: true }
    ).populate("faculty", "name email");

    res
      .status(200)
      .json({ message: "Members added successfully", group: updatedGroup });
  } catch (error) {
    logger.error("🔥 Error Adding Members:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 📌 Remove Members from a Group (Admin/Faculty)
exports.removeMembersFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    let { facultyIds = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    facultyIds = facultyIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (facultyIds.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid members provided to remove" });
    }

    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        $pull: {
          faculty: { $in: facultyIds },
        },
      },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Members removed successfully", group: updatedGroup });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// 📌 Delete a Group (Admin Only)
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid Group ID" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    await Group.findByIdAndDelete(groupId);
    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
