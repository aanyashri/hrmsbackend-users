const express = require("express")
const {
  getDashboardStats,
  getEmployeesList,
  createEmployee,
  updateEmployeeStatus,
} = require("../controllers/adminController")
const { authenticateToken, authorizeRoles } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected and require admin role
router.use(authenticateToken)
router.use(authorizeRoles("HR", "Admin", "Manager"))

router.get("/dashboard", getDashboardStats)
router.get("/employees", getEmployeesList)
router.post("/employees", createEmployee)
router.put("/employees/:id/status", updateEmployeeStatus)

module.exports = router
