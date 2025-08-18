import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log(`Connecting to MongoDB using URI: ${uri}`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // وقت انتظار الاتصال
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    console.error("Ensure MongoDB is running and the URI is correct.");
    process.exit(1);
  }
};
