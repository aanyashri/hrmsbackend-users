const express = require("express")
const {
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  getComplaintTypes,
} = require("../controllers/complaintController")
const { authenticateToken } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are protected
router.use(authenticateToken)

router.post("/", submitComplaint)
router.get("/", getMyComplaints)
router.get("/types", getComplaintTypes)
router.get("/:id", getComplaintById)

module.exports = router
