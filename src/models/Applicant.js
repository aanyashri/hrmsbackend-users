const mongoose = require("mongoose")

const applicantSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      required: true,
    },
    resume: {
      filename: String,
      path: String,
      size: Number,
      mimetype: String,
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    linkedinProfile: {
      type: String,
      trim: true,
    },
    portfolioUrl: {
      type: String,
      trim: true,
    },
    experience: {
      type: Number,
      default: 0,
    },
    currentSalary: {
      type: Number,
    },
    expectedSalary: {
      type: Number,
    },
    noticePeriod: {
      type: String,
      enum: ["immediate", "15-days", "1-month", "2-months", "3-months", "other"],
      default: "1-month",
    },
    status: {
      type: String,
      enum: ["SOURCED", "IN_PROGRESS", "INTERVIEW", "HIRED", "REJECTED"],
      default: "SOURCED",
    },
    source: {
      type: String,
      enum: ["website", "linkedin", "referral", "job-board", "social-media", "other"],
      default: "website",
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["SOURCED", "IN_PROGRESS", "INTERVIEW", "HIRED", "REJECTED"],
        },
        date: {
          type: Date,
          default: Date.now,
        },
        notes: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    interviews: [
      {
        date: {
          type: String,
          required: true,
        },
        time: {
          type: String,
          required: true,
        },
        interviewers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        type: {
          type: String,
          enum: ["phone", "video", "in-person", "technical", "hr"],
          required: true,
        },
        location: {
          type: String,
          default: "Online",
        },
        notes: String,
        status: {
          type: String,
          enum: ["SCHEDULED", "COMPLETED", "CANCELLED", "RESCHEDULED"],
          default: "SCHEDULED",
        },
        feedback: String,
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    notes: [
      {
        content: {
          type: String,
          required: true,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        year: Number,
        grade: String,
      },
    ],
    workExperience: [
      {
        company: String,
        position: String,
        duration: String,
        description: String,
      },
    ],
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
applicantSchema.index({ email: 1 })
applicantSchema.index({ jobId: 1 })
applicantSchema.index({ status: 1 })
applicantSchema.index({ appliedDate: -1 })

// Virtual for full name
applicantSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`
})

module.exports = mongoose.model("Applicant", applicantSchema)
