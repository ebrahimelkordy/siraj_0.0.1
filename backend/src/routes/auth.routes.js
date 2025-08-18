import express from 'express';
import { signup, login, logout  , onboard } from '../controllers/auth.controller.js';
import FriendRequest from '../models/FriendRequest.js';

import { protectRoute } from '../middleware/auth.middleware.js';
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/onboarding',protectRoute,onboard)



//check if user is logged in
router.get("/me", protectRoute, async (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});

export default router;
