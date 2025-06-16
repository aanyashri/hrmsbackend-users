const mongoose = require("mongoose")

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    checkIn: {
      type: String,
      default: null,
    },
    checkOut: {
      type: String,
      default: null,
    },
    workingHours: {
      type: Number,
      default: 0,
    },
    overtime: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["present", "absent", "half-day", "leave", "holiday"],
      default: "absent",
    },
    notes: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    isEarlyLeave: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Create compound index for efficient queries
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true })
attendanceSchema.index({ date: 1 })
attendanceSchema.index({ status: 1 })

module.exports = mongoose.model("Attendance", attendanceSchema)
