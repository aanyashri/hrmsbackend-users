const { generateResponse } = require("../utils/responseHelper")
const { Performance, Employee, User } = require("../models")
const mongoose = require("mongoose")
const moment = require("moment")

/**
 * Get all performance records with filtering
 */
const getAllPerformanceRecords = async (req, res) => {
  try {
    const { employeeId, department, reviewPeriod, page = 1, limit = 20 } = req.query

    // Build query
    const query = {}

    // Filter by employee if provided
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId })
      if (employee) {
        query.employeeId = employee._id
      }
    }

    // Filter by review period if provided
    if (reviewPeriod) {
      query.reviewPeriod = reviewPeriod
    }

    // Filter by department through employee lookup
    let employeeIds = []
    if (department) {
      const employees = await Employee.find({ department })
      employeeIds = employees.map((emp) => emp._id)
      if (employeeIds.length > 0) {
        query.employeeId = { $in: employeeIds }
      }
    }

    // Count total records
    const totalRecords = await Performance.countDocuments(query)

    // Get paginated records
    const performanceRecords = await Performance.find(query)
      .populate({
        path: "employeeId",
        populate: {
          path: "userId",
          model: "User",
          select: "name email",
        },
      })
      .populate("reviewerId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))

    // Format records for frontend
    const formattedRecords = performanceRecords.map((record) => {
      const employee = record.employeeId
      const user = employee.userId || {}

      return {
        id: record._id,
        employeeName: user.name || "Unknown",
        employeeId: employee.employeeId,
        department: employee.department,
        goalName: record.goalName,
        completion: record.completion,
        reviewPeriod: record.reviewPeriod,
        rating: record.rating,
        status: record.status,
        reviewDate: moment(record.reviewDate).format("MMM DD, YYYY"),
      }
    })

    const response = {
      performanceRecords: formattedRecords,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNext: page * limit < totalRecords,
        hasPrev: page > 1,
      },
    }

    res.status(200).json(generateResponse(true, "Performance records retrieved successfully", response))
  } catch (error) {
    console.error("Get performance records error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Create a new performance record
 */
const createPerformanceRecord = async (req, res) => {
  try {
    const { employeeId, goalName, description, targetCompletion, startDate, endDate, reviewPeriod } = req.body

    if (!employeeId || !goalName || !reviewPeriod) {
      return res.status(400).json(generateResponse(false, "Employee ID, goal name and review period are required"))
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId, isActive: true })
    if (!employee) {
      return res.status(404).json(generateResponse(false, "Employee not found"))
    }

    // Create new performance record
    const newPerformance = new Performance({
      employeeId: employee._id,
      goalName,
      description,
      targetCompletion: targetCompletion || 100,
      startDate: startDate || new Date(),
      endDate,
      reviewPeriod,
      completion: 0,
      status: "in-progress",
      createdBy: req.user.id,
    })

    await newPerformance.save()

    res.status(201).json(generateResponse(true, "Performance record created successfully", newPerformance))
  } catch (error) {
    console.error("Create performance record error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Update performance record completion
 */
const updatePerformanceCompletion = async (req, res) => {
  try {
    const { id } = req.params
    const { completion, notes } = req.body

    if (completion === undefined) {
      return res.status(400).json(generateResponse(false, "Completion percentage is required"))
    }

    const performanceRecord = await Performance.findById(id)

    if (!performanceRecord) {
      return res.status(404).json(generateResponse(false, "Performance record not found"))
    }

    // Update completion
    performanceRecord.completion = completion

    // Update status based on completion
    if (completion >= 100) {
      performanceRecord.status = "completed"
      performanceRecord.completionDate = new Date()
    } else if (completion > 0) {
      performanceRecord.status = "in-progress"
    } else {
      performanceRecord.status = "not-started"
    }

    // Add progress note if provided
    if (notes) {
      performanceRecord.progressNotes.push({
        note: notes,
        completion,
        date: new Date(),
        addedBy: req.user.id,
      })
    }

    await performanceRecord.save()

    res.status(200).json(generateResponse(true, "Performance completion updated successfully", performanceRecord))
  } catch (error) {
    console.error("Update performance completion error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Conduct performance review
 */
const conductPerformanceReview = async (req, res) => {
  try {
    const { id } = req.params
    const { rating, feedback, strengths, improvements } = req.body

    if (!rating) {
      return res.status(400).json(generateResponse(false, "Rating is required"))
    }

    const performanceRecord = await Performance.findById(id)

    if (!performanceRecord) {
      return res.status(404).json(generateResponse(false, "Performance record not found"))
    }

    // Update review details
    performanceRecord.rating = rating
    performanceRecord.feedback = feedback
    performanceRecord.strengths = strengths
    performanceRecord.improvements = improvements
    performanceRecord.reviewerId = req.user.id
    performanceRecord.reviewDate = new Date()
    performanceRecord.status = "reviewed"

    await performanceRecord.save()

    res.status(200).json(generateResponse(true, "Performance review conducted successfully", performanceRecord))
  } catch (error) {
    console.error("Conduct performance review error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

/**
 * Get performance statistics
 */
const getPerformanceStats = async (req, res) => {
  try {
    // Get all employees performance
    const allEmployeesPerformance = await Performance.aggregate([
      {
        $group: {
          _id: "$employeeId",
          averageCompletion: { $avg: "$completion" },
          totalGoals: { $sum: 1 },
          completedGoals: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: "$employee",
      },
      {
        $lookup: {
          from: "users",
          localField: "employee.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          employeeName: "$user.name",
          department: "$employee.department",
          averageCompletion: 1,
          totalGoals: 1,
          completedGoals: 1,
        },
      },
      {
        $sort: { averageCompletion: -1 },
      },
    ])

    // Get goal completion statistics
    const goalCompletionStats = await Performance.aggregate([
      {
        $group: {
          _id: null,
          totalGoals: { $sum: 1 },
          completedGoals: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          inProgressGoals: {
            $sum: {
              $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0],
            },
          },
          notStartedGoals: {
            $sum: {
              $cond: [{ $eq: ["$status", "not-started"] }, 1, 0],
            },
          },
        },
      },
    ])

    // Get appraisal completion statistics
    const appraisalCompletionStats = await Performance.aggregate([
      {
        $group: {
          _id: "$reviewPeriod",
          totalAppraisals: { $sum: 1 },
          completedAppraisals: {
            $sum: {
              $cond: [{ $ne: ["$reviewDate", null] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ])

    const stats = {
      allEmployeesPerformance,
      goalCompletion: goalCompletionStats[0] || {
        totalGoals: 0,
        completedGoals: 0,
        inProgressGoals: 0,
        notStartedGoals: 0,
      },
      appraisalCompletion: appraisalCompletionStats,
    }

    res.status(200).json(generateResponse(true, "Performance statistics retrieved successfully", stats))
  } catch (error) {
    console.error("Get performance stats error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAllPerformanceRecords,
  createPerformanceRecord,
  updatePerformanceCompletion,
  conductPerformanceReview,
  getPerformanceStats,
}
