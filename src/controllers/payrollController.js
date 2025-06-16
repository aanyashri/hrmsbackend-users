const moment = require("moment")
const { generateResponse } = require("../utils/responseHelper")
const { Payroll, Employee, User } = require("../models")

const getMyPayrollRecords = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { year, month, status, page = 1, limit = 12, search } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Build query
    const query = { employeeId: employee._id }

    // Filter by year if provided
    if (year) {
      query.year = Number.parseInt(year)
    }

    // Filter by month if provided
    if (month) {
      query.month = Number.parseInt(month)
    }

    // Filter by status if provided
    if (status) {
      query.status = status
    }

    // Get total count
    const totalRecords = await Payroll.countDocuments(query)

    // Get paginated records
    const records = await Payroll.find(query)
      .populate({
        path: "employee",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .sort({ year: -1, month: -1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    // Format records for frontend
    const formattedRecords = records.map((record) => ({
      id: record._id,
      month: moment()
        .month(record.month - 1)
        .format("MMMM"),
      monthNumber: record.month,
      year: record.year,
      amount: record.netSalary,
      creditDate: record.paidDate || record.processedDate,
      deduction: Object.values(record.deductions).reduce((sum, val) => sum + val, 0),
      status: record.status === "paid" ? "Credited" : record.status.charAt(0).toUpperCase() + record.status.slice(1),
      basicSalary: record.basicSalary,
      totalSalary: record.totalSalary,
      allowances: record.allowances,
      deductions: record.deductions,
      overtime: record.overtime,
      bonus: record.bonus,
    }))

    const response = {
      records: formattedRecords,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNext: page * limit < totalRecords,
        hasPrev: page > 1,
      },
      summary: {
        totalEarnings: formattedRecords.reduce((sum, record) => sum + record.amount, 0),
        totalDeductions: formattedRecords.reduce((sum, record) => sum + record.deduction, 0),
        averageSalary:
          formattedRecords.length > 0
            ? Math.round(formattedRecords.reduce((sum, record) => sum + record.amount, 0) / formattedRecords.length)
            : 0,
      },
    }

    res.status(200).json(generateResponse(true, "Payroll records retrieved successfully", response))
  } catch (error) {
    console.error("Get payroll records error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params
    const { employeeId } = req.user

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const payrollRecord = await Payroll.findOne({
      _id: id,
      employeeId: employee._id,
    }).populate({
      path: "employee",
      populate: {
        path: "user",
        select: "name email",
      },
    })

    if (!payrollRecord) {
      return res.status(404).json(generateResponse(false, "Payroll record not found"))
    }

    res.status(200).json(generateResponse(true, "Payroll record retrieved successfully", payrollRecord))
  } catch (error) {
    console.error("Get payroll record error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getCurrentPayroll = async (req, res) => {
  try {
    const { employeeId } = req.user
    const currentMonth = moment().month() + 1
    const currentYear = moment().year()

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const currentPayroll = await Payroll.findOne({
      employeeId: employee._id,
      month: currentMonth,
      year: currentYear,
    }).populate({
      path: "employee",
      populate: {
        path: "user",
        select: "name email",
      },
    })

    if (!currentPayroll) {
      return res.status(404).json(generateResponse(false, "Current month payroll not found"))
    }

    res.status(200).json(generateResponse(true, "Current payroll retrieved successfully", currentPayroll))
  } catch (error) {
    console.error("Get current payroll error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getPayrollSummary = async (req, res) => {
  try {
    const { employeeId } = req.user
    const { year = moment().year() } = req.query

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    const yearRecords = await Payroll.find({
      employeeId: employee._id,
      year: Number.parseInt(year),
    })

    const summary = {
      year: Number.parseInt(year),
      totalMonths: yearRecords.length,
      totalGrossSalary: yearRecords.reduce((sum, record) => sum + record.totalSalary, 0),
      totalNetSalary: yearRecords.reduce((sum, record) => sum + record.netSalary, 0),
      totalDeductions: yearRecords.reduce((sum, record) => {
        return sum + Object.values(record.deductions).reduce((deductionSum, amount) => deductionSum + amount, 0)
      }, 0),
      totalAllowances: yearRecords.reduce((sum, record) => {
        return sum + Object.values(record.allowances).reduce((allowanceSum, amount) => allowanceSum + amount, 0)
      }, 0),
      averageNetSalary:
        yearRecords.length > 0
          ? Math.round(yearRecords.reduce((sum, record) => sum + record.netSalary, 0) / yearRecords.length)
          : 0,
      monthlyBreakdown: yearRecords.map((record) => ({
        month: moment()
          .month(record.month - 1)
          .format("MMMM"),
        netSalary: record.netSalary,
        status: record.status,
      })),
    }

    res.status(200).json(generateResponse(true, "Payroll summary retrieved successfully", summary))
  } catch (error) {
    console.error("Get payroll summary error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getMyPayrollRecords,
  getPayrollById,
  getCurrentPayroll,
  getPayrollSummary,
}
