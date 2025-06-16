const moment = require("moment")
const { generateResponse } = require("../utils/responseHelper")

// Mock holidays database
const holidays = [
  {
    id: 1,
    name: "Raksha Bandhan",
    date: "2025-08-09",
    day: "Saturday",
    type: "festival",
    description: "Hindu festival celebrating the bond between brothers and sisters",
  },
  {
    id: 2,
    name: "Independence Day",
    date: "2025-08-15",
    day: "Friday",
    type: "national",
    description: "Indian Independence Day",
  },
  {
    id: 3,
    name: "Parsi New Year",
    date: "2025-08-16",
    day: "Friday",
    type: "festival",
    description: "Parsi New Year celebration",
  },
  {
    id: 4,
    name: "Janmashtami",
    date: "2025-08-16",
    day: "Saturday",
    type: "festival",
    description: "Birth of Lord Krishna",
  },
  {
    id: 5,
    name: "Ganesh Chaturthi",
    date: "2025-08-27",
    day: "Wednesday",
    type: "festival",
    description: "Hindu festival honoring Lord Ganesha",
  },
]

const getAllHolidays = async (req, res) => {
  try {
    const { year, month, type, page = 1, limit = 20 } = req.query

    let filteredHolidays = [...holidays]

    // Filter by year
    if (year) {
      filteredHolidays = filteredHolidays.filter((holiday) => moment(holiday.date).year() === Number.parseInt(year))
    }

    // Filter by month
    if (month) {
      filteredHolidays = filteredHolidays.filter(
        (holiday) => moment(holiday.date).month() === Number.parseInt(month) - 1,
      )
    }

    // Filter by type
    if (type) {
      filteredHolidays = filteredHolidays.filter((holiday) => holiday.type === type)
    }

    // Sort by date
    filteredHolidays.sort((a, b) => new Date(a.date) - new Date(b.date))

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + Number.parseInt(limit)
    const paginatedHolidays = filteredHolidays.slice(startIndex, endIndex)

    const response = {
      holidays: paginatedHolidays,
      pagination: {
        currentPage: Number.parseInt(page),
        totalPages: Math.ceil(filteredHolidays.length / limit),
        totalHolidays: filteredHolidays.length,
      },
    }

    res.status(200).json(generateResponse(true, "Holidays retrieved successfully", response))
  } catch (error) {
    console.error("Get holidays error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getUpcomingHolidays = async (req, res) => {
  try {
    const { limit = 5 } = req.query
    const today = moment().format("YYYY-MM-DD")

    const upcomingHolidays = holidays
      .filter((holiday) => holiday.date >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, Number.parseInt(limit))

    res.status(200).json(generateResponse(true, "Upcoming holidays retrieved successfully", upcomingHolidays))
  } catch (error) {
    console.error("Get upcoming holidays error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getHolidayById = async (req, res) => {
  try {
    const { id } = req.params

    const holiday = holidays.find((holiday) => holiday.id === Number.parseInt(id))

    if (!holiday) {
      return res.status(404).json(generateResponse(false, "Holiday not found"))
    }

    res.status(200).json(generateResponse(true, "Holiday retrieved successfully", holiday))
  } catch (error) {
    console.error("Get holiday error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

const getHolidayTypes = async (req, res) => {
  try {
    const types = [...new Set(holidays.map((holiday) => holiday.type))]

    res.status(200).json(generateResponse(true, "Holiday types retrieved successfully", types))
  } catch (error) {
    console.error("Get holiday types error:", error)
    res.status(500).json(generateResponse(false, "Internal server error"))
  }
}

module.exports = {
  getAllHolidays,
  getUpcomingHolidays,
  getHolidayById,
  getHolidayTypes,
}
