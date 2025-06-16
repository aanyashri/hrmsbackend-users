const { generateResponse } = require("../utils/responseHelper")
const { Schedule, Employee } = require("../models")
const moment = require("moment")

const createSchedule = async (req, res) => {
  try {
    const { scheduleName, details, date, time, employeeId, type } = req.body

    if (!scheduleName || !date || !time) {
      return res.status(400).json(generateResponse(false, "Schedule name, date, and time are required"))
    }

    const newSchedule = new Schedule({
      title: scheduleName,
      description: details,
      date: new Date(date),
      time,
      type: type || "meeting",
      employeeId: employeeId || null,
      createdBy: req.user.userId,
    })

    await newSchedule.save()

    // Populate employee data if exists
    if (employeeId) {
      await newSchedule.populate({
        path: "employeeId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
    }

    res.status(201).json(generateResponse(true, "Schedule created successfully", newSchedule))
  } catch (error) {
    console.error("Create schedule error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getSchedules = async (req, res) => {
  try {
    const { date, page = 1, limit = 20, type } = req.query

    const query = { isActive: true }

    if (date) {
      query.date = new Date(date)
    }

    if (type) {
      query.type = type
    }

    const schedules = await Schedule.find(query)
      .populate({
        path: "employeeId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate("createdBy", "name email")
      .sort({ date: 1, time: 1 })
      .limit(Number.parseInt(limit))
      .skip((page - 1) * limit)

    const totalSchedules = await Schedule.countDocuments(query)

    const formattedSchedules = schedules.map((schedule) => ({
      id: schedule._id,
      title: schedule.title,
      description: schedule.description,
      date: schedule.date,
      time: schedule.time,
      type: schedule.type,
      employee: schedule.employeeId
        ? {
            name: schedule.employeeId.userId.name,
            email: schedule.employeeId.userId.email,
            employeeId: schedule.employeeId.employeeId,
          }
        : null,
      createdBy: schedule.createdBy,
    }))

    const response = {
      schedules: formattedSchedules,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(totalSchedules / limit),
        totalSchedules,
      },
    }

    res.status(200).json(generateResponse(true, "Schedules retrieved successfully", response))
  } catch (error) {
    console.error("Get schedules error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const schedule = await Schedule.findById(id)
    if (!schedule) {
      return res.status(404).json(generateResponse(false, "Schedule not found"))
    }

    Object.assign(schedule, updates)
    await schedule.save()

    res.status(200).json(generateResponse(true, "Schedule updated successfully", schedule))
  } catch (error) {
    console.error("Update schedule error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params

    const schedule = await Schedule.findById(id)
    if (!schedule) {
      return res.status(404).json(generateResponse(false, "Schedule not found"))
    }

    schedule.isActive = false
    await schedule.save()

    res.status(200).json(generateResponse(true, "Schedule deleted successfully"))
  } catch (error) {
    console.error("Delete schedule error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
}
