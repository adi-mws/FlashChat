import mongoose from 'mongoose';

// Database connection function
const connectDB = async () => {
  try {
    const conn = await mongoose.connect("mongodb://localhost:27017/ChatApp");
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);  // Exit the process with failure
  }
};

export default connectDB;