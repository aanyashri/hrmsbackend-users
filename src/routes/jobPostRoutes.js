const express = require("express")
const {
  createJobPost,
  getJobPosts,
  getJobPostById,
  updateJobPost,
  deleteJobPost,
  shareJobPost,
} = require("../controllers/jobPostController")
const { authenticateToken, authorizeRoles } = require("../middlewares/authMiddleware")

const router = express.Router()

// Public routes
router.get("/", getJobPosts)
router.get("/:id", getJobPostById)
router.post("/:id/share", shareJobPost)

// Protected routes (require admin role)
router.use(authenticateToken)
router.use(authorizeRoles("HR", "Admin", "Manager"))

router.post("/", createJobPost)
router.put("/:id", updateJobPost)
router.delete("/:id", deleteJobPost)

module.exports = router
