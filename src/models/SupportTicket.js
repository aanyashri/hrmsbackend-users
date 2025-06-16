const mongoose = require("mongoose")

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Leave and Attendance",
        "Payroll and Salary",
        "Technical Issues",
        "HR Policies",
        "Account Access",
        "General Inquiry",
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
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
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
    responses: [
      {
        responderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isInternal: {
          type: Boolean,
          default: false,
        },
      },
    ],
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for employee data
supportTicketSchema.virtual("employee", {
  ref: "Employee",
  localField: "employeeId",
  foreignField: "_id",
  justOne: true,
})

// Auto-generate ticket ID
supportTicketSchema.pre("save", async function (next) {
  if (!this.ticketId) {
    const count = await this.constructor.countDocuments()
    this.ticketId = `TKT${String(count + 1).padStart(6, "0")}`
  }
  next()
})

// Index for efficient queries
supportTicketSchema.index({ employeeId: 1 })
supportTicketSchema.index({ status: 1 })
supportTicketSchema.index({ category: 1 })
supportTicketSchema.index({ ticketId: 1 })

module.exports = mongoose.model("SupportTicket", supportTicketSchema)
