const express = require("express")
const {
  getAllHolidays,
  getUpcomingHolidays,
  getHolidayById,
  getHolidayTypes,
} = require("../controllers/holidayController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.get("/", getAllHolidays)
router.get("/upcoming", getUpcomingHolidays)
router.get("/types", getHolidayTypes)
router.get("/:id", getHolidayById)

module.exports = router
