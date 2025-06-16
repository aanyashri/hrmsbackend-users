const mongoose = require("mongoose")

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["sick", "casual", "annual", "maternity", "paternity", "emergency", "personal"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 0.5,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvedDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String,
      },
    ],
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDayPeriod: {
      type: String,
      enum: ["morning", "afternoon"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for employee data
leaveRequestSchema.virtual("employee", {
  ref: "Employee",
  localField: "employeeId",
  foreignField: "_id",
  justOne: true,
})

// Virtual for approver data
leaveRequestSchema.virtual("approver", {
  ref: "Employee",
  localField: "approvedBy",
  foreignField: "_id",
  justOne: true,
})

// Index for efficient queries
leaveRequestSchema.index({ employeeId: 1, startDate: 1, endDate: 1 })
leaveRequestSchema.index({ status: 1 })
leaveRequestSchema.index({ startDate: 1, endDate: 1 })

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema)
