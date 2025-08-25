
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

// Default route for root
app.get('/', (req, res) => {
    res.send('Welcome to the Siraj API!');
});

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/notifications', notificationRoutes);

// Async function to setup static file serving
async function setupStaticFileServing() {
    if (process.env.NODE_ENV === "production") {
        // Try multiple possible paths for the built frontend in different deployment scenarios
        const possiblePaths = [
            path.join(__dirname, '../frontend/dist'),           // Local development
            path.join(__dirname, '../../frontend/dist'),        // Railway/Heroku structure
            path.join(process.cwd(), 'frontend/dist'),          // Current working directory
            path.join(process.cwd(), '../frontend/dist'),       // Parent directory
            '/app/frontend/dist',                               // Railway absolute path
            '/app/backend/frontend/dist'                        // Railway backend path
        ];

        let staticPath = null;
        for (const possiblePath of possiblePaths) {
            try {
                // Check if the path exists and contains index.html
                const fs = await import('fs');
                if (fs.existsSync(possiblePath) &&
                    fs.existsSync(path.join(possiblePath, 'index.html'))) {
                    staticPath = possiblePath;
                    console.log(`Found frontend build at: ${staticPath}`);
                    break;
                }
            } catch (error) {
                console.log(`Path check failed for ${possiblePath}:`, error.message);
            }
        }

        if (staticPath) {
            console.log(`Serving static files from: ${staticPath}`);
            app.use(express.static(staticPath));
            app.get('*', (req, res) => {
                res.sendFile(path.join(staticPath, 'index.html'));
            });
        } else {
            console.log('Frontend build not found. Running in API-only mode.');
            // For API routes, return JSON responses
            app.get('/', (req, res) => {
                res.json({
                    message: 'Siraj API Server',
                    status: 'running',
                    frontend: 'not built'
                });
            });
        }
    }
}

// Call the async function to setup static file serving
setupStaticFileServing();

// Temporary test route
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: 'Test route works!' });
});

// شغل السيرفر هنا بعد تعريف كل شيء
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
