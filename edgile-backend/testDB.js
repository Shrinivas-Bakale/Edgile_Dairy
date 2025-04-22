require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const testConnection = async () => {
    try {
        logger.info("🚀 Testing MongoDB Connection...");
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        logger.info("✅ Connection Successful!");
        mongoose.connection.close();
    } catch (error) {
        logger.error(`❌ Connection Failed: ${error.message}`);
    }
};

testConnection();
