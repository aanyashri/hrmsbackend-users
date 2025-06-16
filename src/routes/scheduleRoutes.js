const express = require("express")
const { createSchedule, getSchedules, updateSchedule, deleteSchedule } = require("../controllers/scheduleController")
const { authenticateToken, authorizeRoles } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected and require admin role
router.use(authenticateToken)
router.use(authorizeRoles("HR", "Admin", "Manager"))

router.post("/", createSchedule)
router.get("/", getSchedules)
router.put("/:id", updateSchedule)
router.delete("/:id", deleteSchedule)

module.exports = router
