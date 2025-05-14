const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true }, // 'yyyy-MM-dd'
  type: { type: String, required: true },
  description: { type: String }
}, { _id: false });

const COESchema = new mongoose.Schema({
  name: { type: String, required: true },
  academicYear: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  events: [[EventSchema]], // Nested array for grouped events
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

COESchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('COE', COESchema); 