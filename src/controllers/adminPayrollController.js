const { generateResponse } = require("../utils/responseHelper")
const { Payroll, Employee, User } = require("../models")
const mongoose = require("mongoose")
const moment = require("moment")

/**
 * Get all payroll records with filtering
 */
const getAllPayrolls = async (req, res) => {
  try {
    const { month, year, status, employeeId, department, page = 1, limit = 20 } = req.query

    // Build query
    const query = {}

    // Filter by month and year if provided
    if (month && year) {
      query.month = Number(month)
      query.year = Number(year)
    }

    // Filter by status if provided
    if (status) {
      query.status = status
    }

    // Filter by employee if provided
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId })
      if (employee) {
        query.employeeId = employee._id
      }
    }

    // Filter by department through employee lookup
    if (department) {
      const employees = await Employee.find({ department })
      if (employees.length > 0) {
        query.employeeId = { $in: employees.map((emp) => emp._id) }
      }
    }

    // Count total records
    const totalRecords = await Payroll.countDocuments(query)

    // Get paginated records
    const payrolls = await Payroll.find(query)
      .populate({
        path: "employeeId",
        populate: {
          path: "userId",
          model: "User",
          select: "name email",
        },
      })
      .sort({ year: -1, month: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    // Format records for frontend
    const formattedPayrolls = payrolls.map((record) => ({
      id: record._id,
      employeeName: record.employeeId.userId ? record.employeeId.userId.name : "Unknown",
      employeeId: record.employeeId.employeeId,
      month: moment()
        .month(record.month - 1)
        .format("MMMM"),
      year: record.year,
      startDate: moment(`${record.year}-${record.month}-01`).format("MMM DD, YYYY"),
      endDate: moment(`${record.year}-${record.month}-01`).endOf("month").format("MMM DD, YYYY"),
      totalDays: moment(`${record.year}-${record.month}`, "YYYY-MM").daysInMonth(),
      totalHours: record.workingHours || "170h 30m",
      amount: record.netSalary,
      status: record.status,
    }))

    const response = {
      payrolls: formattedPayrolls,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNext: page * limit < totalRecords,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Payroll records retrieved successfully", response))
  } catch (error) {
    console.error("Get payrolls error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Generate payroll for a specific month and year
 */
const generatePayroll = async (req, res) => {
  try {
    const { month, year } = req.body

    if (!month || !year) {
      return res.status(400).json(generateResponse(false, "Month and year are required"))
    }

    // Get all active employees
    const employees = await Employee.find({ isActive: true })

    // Generate payroll for each employee
    const generatedPayrolls = []
    const errors = []

    for (const employee of employees) {
      try {
        // Check if payroll already exists for this employee, month and year
        const existingPayroll = await Payroll.findOne({
          employeeId: employee._id,
          month: Number(month),
          year: Number(year),
        })

        if (existingPayroll) {
          errors.push(`Payroll already exists for employee ${employee.employeeId} for ${month}/${year}`)
          continue
        }

        // Calculate working days in the month
        const daysInMonth = moment(`${year}-${month}`, "YYYY-MM").daysInMonth()

        // Get attendance records for the month to calculate working hours
        // This is a simplified calculation - in a real system, you'd query attendance records
        const workingHours = 8 * 22 // Assuming 8 hours per day, 22 working days

        // Calculate salary components
        const basicSalary = employee.salary || 0
        const hra = basicSalary * 0.4
        const transport = 1500
        const medical = 1000
        const tax = basicSalary * 0.1
        const pf = basicSalary * 0.12

        // Create new payroll record
        const newPayroll = new Payroll({
          employeeId: employee._id,
          month: Number(month),
          year: Number(year),
          basicSalary,
          allowances: {
            hra,
            transport,
            medical,
            food: 0,
            other: 0,
          },
          deductions: {
            tax,
            pf,
            insurance: 0,
            loan: 0,
            other: 0,
          },
          overtime: 0,
          bonus: 0,
          totalSalary: basicSalary + hra + transport + medical,
          netSalary: basicSalary + hra + transport + medical - tax - pf,
          status: "draft",
          workingHours,
          workingDays: 22,
          processedDate: new Date(),
        })

        await newPayroll.save()
        generatedPayrolls.push(newPayroll)
      } catch (err) {
        errors.push(`Error generating payroll for employee ${employee.employeeId}: ${err.message}`)
      }
    }

    res.status(200).json(
      generateResponse(true, "Payroll generated successfully", {
        generatedCount: generatedPayrolls.length,
        errors: errors.length > 0 ? errors : null,
      }),
    )
  } catch (error) {
    console.error("Generate payroll error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Process payroll (change status from draft to processed)
 */
const processPayroll = async (req, res) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(generateResponse(false, "Payroll IDs are required"))
    }

    // Update status to processed
    const result = await Payroll.updateMany(
      { _id: { $in: ids.map((id) => mongoose.Types.ObjectId(id)) }, status: "draft" },
      {
        $set: {
          status: "processed",
          processedDate: new Date(),
          processedBy: req.user.id,
        },
      },
    )

    res.status(200).json(
      generateResponse(true, "Payroll processed successfully", {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      }),
    )
  } catch (error) {
    console.error("Process payroll error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Make payment (change status from processed to paid)
 */
const makePayment = async (req, res) => {
  try {
    const { id } = req.params
    const { paymentMethod, accountNumber, transactionId } = req.body

    if (!paymentMethod) {
      return res.status(400).json(generateResponse(false, "Payment method is required"))
    }

    const payroll = await Payroll.findById(id)

    if (!payroll) {
      return res.status(404).json(generateResponse(false, "Payroll record not found"))
    }

    if (payroll.status === "paid") {
      return res.status(400).json(generateResponse(false, "Payroll is already paid"))
    }

    // Update payroll status to paid
    payroll.status = "paid"
    payroll.paidDate = new Date()
    payroll.paymentMethod = paymentMethod
    payroll.accountNumber = accountNumber
    payroll.transactionId = transactionId
    payroll.paidBy = req.user.id

    await payroll.save()

    res.status(200).json(generateResponse(true, "Payment made successfully", payroll))
  } catch (error) {
    console.error("Make payment error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get payment method details
 */
const getPaymentMethod = async (req, res) => {
  try {
    // In a real application, this would be fetched from the database
    // For now, we'll return mock data
    const paymentMethod = {
      cardholderName: "Anyname Company LTD",
      accountNumber: "**** **** **** 8954",
      date: "01/25",
      paymentMethod: "NFT",
    }

    res.status(200).json(generateResponse(true, "Payment method retrieved successfully", paymentMethod))
  } catch (error) {
    console.error("Get payment method error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Update payment method
 */
const updatePaymentMethod = async (req, res) => {
  try {
    const { cardholderName, accountNumber, expiryDate, paymentMethod } = req.body

    if (!cardholderName || !accountNumber || !paymentMethod) {
      return res.status(400).json(generateResponse(false, "All fields are required"))
    }

    // In a real application, this would update the payment method in the database
    // For now, we'll just return success
    const updatedPaymentMethod = {
      cardholderName,
      accountNumber: accountNumber.replace(/\d(?=\d{4})/g, "*"),
      date: expiryDate,
      paymentMethod,
    }

    res.status(200).json(generateResponse(true, "Payment method updated successfully", updatedPaymentMethod))
  } catch (error) {
    console.error("Update payment method error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Generate payslip for an employee
 */
const generatePayslip = async (req, res) => {
  try {
    const { id } = req.params

    const payroll = await Payroll.findById(id).populate({
      path: "employeeId",
      populate: {
        path: "userId",
        model: "User",
        select: "name email",
      },
    })

    if (!payroll) {
      return res.status(404).json(generateResponse(false, "Payroll record not found"))
    }

    // In a real application, you would generate a PDF payslip here
    // For now, we'll just return the payroll data
    const payslip = {
      employeeName: payroll.employeeId.userId ? payroll.employeeId.userId.name : "Unknown",
      employeeId: payroll.employeeId.employeeId,
      department: payroll.employeeId.department,
      designation: payroll.employeeId.designation,
      month: moment()
        .month(payroll.month - 1)
        .format("MMMM"),
      year: payroll.year,
      basicSalary: payroll.basicSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      overtime: payroll.overtime,
      bonus: payroll.bonus,
      totalSalary: payroll.totalSalary,
      netSalary: payroll.netSalary,
      paymentDate: payroll.paidDate || payroll.processedDate,
      paymentMethod: payroll.paymentMethod || "Bank Transfer",
    }

    res.status(200).json(generateResponse(true, "Payslip generated successfully", payslip))
  } catch (error) {
    console.error("Generate payslip error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAllPayrolls,
  generatePayroll,
  processPayroll,
  makePayment,
  getPaymentMethod,
  updatePaymentMethod,
  generatePayslip,
}
