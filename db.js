const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🌊 Database connected for Admin Tools");
    } catch (err) {
        console.error("DB Connection Error:", err);
    }
};

module.exports = connectDB;