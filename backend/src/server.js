import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';

// Import routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import deploymentRoutes from './routes/deployments.js';
import domainsRoutes from './routes/domains.js';
import databaseRoutes from './routes/databases.js';
import analyticsRoutes from './routes/analytics.js';

// Import middleware
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Initialize environment
dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Store io instance in app for routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/domains', domainsRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.io for real-time logs
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('subscribe-logs', (projectId) => {
    socket.join(`logs:${projectId}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 DENNIS TECH HOSTING - Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
export { io };
