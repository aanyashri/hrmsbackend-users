const mongoose = require("mongoose")

const scheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["meeting", "interview", "training", "event", "deadline", "reminder"],
      default: "meeting",
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    location: {
      type: String,
      trim: true,
    },
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for employee data
scheduleSchema.virtual("employee", {
  ref: "Employee",
  localField: "employeeId",
  foreignField: "_id",
  justOne: true,
})

// Index for efficient queries
scheduleSchema.index({ date: 1, time: 1 })
scheduleSchema.index({ employeeId: 1 })
scheduleSchema.index({ type: 1 })
scheduleSchema.index({ isActive: 1 })

module.exports = mongoose.model("Schedule", scheduleSchema)
