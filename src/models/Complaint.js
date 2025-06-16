const mongoose = require("mongoose")

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    complaintType: {
      type: String,
      enum: [
        "Salary Issue",
        "Workplace Harassment",
        "Discrimination",
        "Work Environment",
        "Management Issues",
        "Policy Violation",
        "Safety Concerns",
        "Benefits Issue",
        "Other",
      ],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["submitted", "under-review", "investigating", "resolved", "closed", "rejected"],
      default: "submitted",
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    assignedDate: {
      type: Date,
    },
    investigationNotes: [
      {
        note: String,
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        isInternal: {
          type: Boolean,
          default: true,
        },
      },
    ],
    attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String,
      },
    ],
    resolution: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for employee data
complaintSchema.virtual("employee", {
  ref: "Employee",
  localField: "employeeId",
  foreignField: "_id",
  justOne: true,
})

// Auto-generate complaint ID
complaintSchema.pre("save", async function (next) {
  if (!this.complaintId) {
    const count = await this.constructor.countDocuments()
    this.complaintId = `CMP${String(count + 1).padStart(6, "0")}`
  }
  next()
})

// Index for efficient queries
complaintSchema.index({ employeeId: 1 })
complaintSchema.index({ status: 1 })
complaintSchema.index({ complaintType: 1 })
complaintSchema.index({ priority: 1 })

module.exports = mongoose.model("Complaint", complaintSchema)
