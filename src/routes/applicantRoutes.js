const express = require("express")
const router = express.Router()
const {
  getAllApplicants,
  getApplicantById,
  updateApplicantStatus,
  addApplicantNote,
  scheduleInterview,
  getApplicantStats,
} = require("../controllers/applicantController")
const { authenticateToken } = require("../middlewares/authMiddleware")

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Applicant routes
router.get("/", getAllApplicants)
router.get("/stats", getApplicantStats)
router.get("/:id", getApplicantById)
router.put("/:id/status", updateApplicantStatus)
router.post("/:id/notes", addApplicantNote)
router.post("/:id/interview", scheduleInterview)

module.exports = router
