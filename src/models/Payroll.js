const mongoose = require("mongoose")

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      hra: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    deductions: {
      tax: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      loan: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    overtime: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "processed", "paid"],
      default: "draft",
    },
    processedDate: {
      type: Date,
    },
    paidDate: {
      type: Date,
    },
    payslipPath: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Virtual for employee data
payrollSchema.virtual("employee", {
  ref: "Employee",
  localField: "employeeId",
  foreignField: "_id",
  justOne: true,
})

// Compound index for unique employee-month-year combination
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true })
payrollSchema.index({ status: 1 })

module.exports = mongoose.model("Payroll", payrollSchema)
