const mongoose = require("mongoose")

const performanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    goalName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    targetCompletion: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    completion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    reviewPeriod: {
      type: String,
      enum: ["Q1", "Q2", "Q3", "Q4", "H1", "H2", "Annual"],
      required: true,
    },
    status: {
      type: String,
      enum: ["not-started", "in-progress", "completed", "reviewed"],
      default: "not-started",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
    },
    strengths: [
      {
        type: String,
        trim: true,
      },
    ],
    improvements: [
      {
        type: String,
        trim: true,
      },
    ],
    progressNotes: [
      {
        note: {
          type: String,
          required: true,
        },
        completion: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewDate: {
      type: Date,
    },
    completionDate: {
      type: Date,
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
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
performanceSchema.index({ employeeId: 1 })
performanceSchema.index({ reviewPeriod: 1 })
performanceSchema.index({ status: 1 })
performanceSchema.index({ createdAt: -1 })

module.exports = mongoose.model("Performance", performanceSchema)
