const mongoose = require("mongoose")

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: "Employee",
    },
    department: {
      type: String,
      required: true,
      default: "General",
    },
    designation: {
      type: String,
      trim: true,
    },
    salary: {
      type: Number,
      default: 0,
      min: 0,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    workLocation: {
      type: String,
      default: "Office",
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Intern"],
      default: "Full-time",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for user data
employeeSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
})

// Virtual for manager data
employeeSchema.virtual("manager", {
  ref: "Employee",
  localField: "managerId",
  foreignField: "_id",
  justOne: true,
})

module.exports = mongoose.model("Employee", employeeSchema)
