const mongoose = require("mongoose")
const dotenv = require("dotenv")
const { seedSampleData } = require("./sampleData")

// Load environment variables
dotenv.config()

const runSeeders = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("📊 Connected to MongoDB")

    // Run seeders
    await seedSampleData()

    console.log("🎉 All seeders completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Seeder error:", error)
    process.exit(1)
  }
}

runSeeders()
