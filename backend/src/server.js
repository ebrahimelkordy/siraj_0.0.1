
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.route.js';
import groupRoutes from './routes/group.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { fileURLToPath } from 'url';
import path from "path";
import { connectDB } from './lib/db.js';

const PORT = process.env.PORT || 5001;
dotenv.config();

const app = express();
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://siraj001-production.up.railway.app"
    ], // Adjust this to your frontend URL
    credentials: true, // Allow cookies to be sent with requests
}));
app.use(express.json());
app.use(cookieParser());

// Connect to the database
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
    // Serve the frontend if the staticPath is defined
    if (staticPath) {
        res.sendFile(path.join(staticPath, 'index.html'));
    } else {
        res.send('Welcome to the Siraj API!');
    }
});

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static files from the 'dist' directory
const staticDir = path.join(__dirname, "../dist");
app.use(express.static(staticDir));

// For any other request, serve the index.html file
app.get("*", (req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
});

// Temporary test route
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Test route works!' });
});

// شغل السيرفر هنا بعد تعريف كل شيء
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
