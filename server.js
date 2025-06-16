require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Import routess
const authRoutes = require("./src/routes/authRoutes");
const employeeRoutes = require("./src/routes/employeeRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const leaveRoutes = require("./src/routes/leaveRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const holidayRoutes = require("./src/routes/holidayRoutes");
const payrollRoutes = require("./src/routes/payrollRoutes");
const policyRoutes = require("./src/routes/policyRoutes");
const supportRoutes = require("./src/routes/supportRoutes");
const complaintRoutes = require("./src/routes/complaintRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const callRoutes = require("./src/routes/callRoutes");

// Admin routesss
const adminAuthRoutes = require("./src/routes/adminAuthRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const adminLeaveRoutes = require("./src/routes/adminLeaveRoutes");
const adminAttendanceRoutes = require("./src/routes/adminAttendanceRoutes");
const adminPayrollRoutes = require("./src/routes/adminPayrollRoutes");
const adminPerformanceRoutes = require("./src/routes/adminPerformanceRoutes");
const policyAdminRoutes = require("./src/routes/policyAdminRoutes");
const jobPostRoutes = require("./src/routes/jobPostRoutes");
const applicantRoutes = require("./src/routes/applicantRoutes");
const scheduleRoutes = require("./src/routes/scheduleRoutes");
const adminSettingsRoutes = require("./src/routes/adminSettingsRoutes");
const adminChatRoutes = require("./src/routes/adminChatRoutes");
const adminNotificationRoutes = require("./src/routes/adminNotificationRoutes");

// Test routes
const testRoutes = require("./src/routes/testRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || "v1";

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, process.env.UPLOAD_PATH || "./uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadsDir));

// API routes
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API is running",
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Mount routes
apiRouter.use("/auth", authRoutes);
apiRouter.use("/employees", employeeRoutes);
apiRouter.use("/profile", profileRoutes);
apiRouter.use("/leave", leaveRoutes);
apiRouter.use("/attendance", attendanceRoutes);
apiRouter.use("/holidays", holidayRoutes);
apiRouter.use("/payroll", payrollRoutes);
apiRouter.use("/policies", policyRoutes);
apiRouter.use("/support", supportRoutes);
apiRouter.use("/complaints", complaintRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/chat", chatRoutes);
apiRouter.use("/calls", callRoutes);

// Admin routes
apiRouter.use("/admin/auth", adminAuthRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/admin/leave", adminLeaveRoutes);
apiRouter.use("/admin/attendance", adminAttendanceRoutes);
apiRouter.use("/admin/payroll", adminPayrollRoutes);
apiRouter.use("/admin/performance", adminPerformanceRoutes);
apiRouter.use("/admin/policies", policyAdminRoutes);
apiRouter.use("/admin/jobs", jobPostRoutes);
apiRouter.use("/admin/applicants", applicantRoutes);
apiRouter.use("/admin/schedule", scheduleRoutes);
apiRouter.use("/admin/settings", adminSettingsRoutes);
apiRouter.use("/admin/chat", adminChatRoutes);
apiRouter.use("/admin/notifications", adminNotificationRoutes);

// Test routes
apiRouter.use("/test", testRoutes);

// Mount API router
app.use(`/api/${API_VERSION}`, apiRouter);
app.use("/api", apiRouter); // Default route without version

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

db.once("open", () => {
  console.log("Connected to MongoDB");

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API version: ${API_VERSION}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
});

// Handle MongoDB connection events
db.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

db.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

// Handle process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
