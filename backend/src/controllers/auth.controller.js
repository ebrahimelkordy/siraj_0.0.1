import { upsertStreamUser } from '../lib/stream.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

export async function signup(req, res) {

    const { email, password, fullName } = req.body;

    try {
        // Validate the input
        if (!email || !password || !fullName) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate a random avatar
        const idx = Math.floor(Math.random() * 1000) + 1;
        const randomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${idx}`;
        // Create a new user
        const newUser = await User.create({ email, password, fullName, profilePic: randomAvatar });
        try {
            await upsertStreamUser({
                id: newUser._id.toString(),
                name: newUser.fullName,
                image: newUser.profilePic || '',
            })

        } catch (error) {

        }
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Set the JWT cookie
        res.cookie('JWT', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax', // Changed from 'strict' to 'lax' for better cross-origin compatibility
            secure: process.env.NODE_ENV === 'production',
        });

        await newUser.save();
        res.status(201).json({ success: true, user: newUser, message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}
export async function login(req, res) {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }
        console.log("Login attempt for email:", email);
        const user = await User.findOne({ email });
        console.log("User found:", user);
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const isPasswordCorrect = await user.matchPassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // If email and password are correct, generate token and set cookie
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('JWT', token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax', // Changed from 'strict' to 'lax' for better cross-origin compatibility
            secure: process.env.NODE_ENV === 'production',
        });

        res.status(200).json({ success: true, user, message: 'Logged in successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
}
export async function logout(req, res) {
    // Placeholder for logout logic
    res.clearCookie('JWT')
    res.status(200).json({ success: true, message: 'Logged out successfully' });

}
export async function onboard(req, res) {

    try {
        const userId = req.user._id;
        const { fullName, bio, nativeLanguage, educationalPath, learningLanguage, location, gender } = req.body;
        if (!fullName || !nativeLanguage || !gender) {
            return res.status(400).json({
                message: 'Please fill in all fields',
                missingFields: [
                    !fullName && 'fullName',
                    !nativeLanguage && 'nativeLanguage',
                    !gender && 'gender'
                ].filter(Boolean),
            });
        }
        const updatedUser = await User.findByIdAndUpdate(userId, {
            ...req.body,
            isOnboarded: true,
        }, {
            new: true,
        });
        if (!updatedUser) { return res.status(400).json({ message: 'User not found' }); }
        try {
            await upsertStreamUser({
                id: updatedUser._id.toString(),
                name: updatedUser.fullName,
                image: updatedUser.profilePic || '',
            });
        } catch (error) {
            res.status(500).json
        }

        res.status(200).json({ success: true, user: updatedUser });


    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }

}



