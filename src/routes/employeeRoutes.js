const express = require("express")
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.get("/", getAllEmployees)
router.get("/:id", getEmployeeById)
router.post("/", createEmployee)
router.put("/:id", updateEmployee)
router.delete("/:id", deleteEmployee)

module.exports = router
