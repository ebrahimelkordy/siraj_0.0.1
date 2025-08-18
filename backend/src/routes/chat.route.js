import express from "express";
import { getStreamToken } from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { streamClient } from "../lib/stream.js";

const router = express.Router();

// Get Stream token
router.get("/token", protectRoute, getStreamToken);

// Create user in Stream
router.post("/users/:userId", protectRoute, async (req, res) => {
  try {
    const { userId } = req.params;

    // Create user in Stream
    await streamClient.upsertUser({
      id: userId,
      role: "user",
    });

    res.status(200).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user in Stream:", error);
    res.status(500).json({ error: "An error occurred while creating the user" });
  }
});

export default router;