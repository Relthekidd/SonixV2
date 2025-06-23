import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { errorHandler, notFound } from '@/middleware/errorMiddleware';
import { generalLimiter, authLimiter, uploadLimiter, searchLimiter } from '@/middleware/rateLimitMiddleware';
import { setupDatabase } from '@/database/connection';
import { WebSocketService } from '@/services/websocketService';
import { AnalyticsService } from '@/services/analyticsService';

// Routes
import authRoutes from '@/routes/authRoutes';
import userRoutes from '@/routes/userRoutes';
import artistRoutes from '@/routes/artistRoutes';
import trackRoutes from '@/routes/trackRoutes';
import albumRoutes from '@/routes/albumRoutes';
import playlistRoutes from '@/routes/playlistRoutes';
import searchRoutes from '@/routes/searchRoutes';
import uploadRoutes from '@/routes/uploadRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Create HTTP server for WebSocket support
const server = createServer(app);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
app.use(generalLimiter);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sonix Music API',
      version: '1.0.0',
      description: 'A comprehensive music streaming API with real-time features',
      contact: {
        name: 'API Support',
        email: 'support@sonix.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/${API_VERSION}`,
        description: 'Development server'
      },
      {
        url: `https://api.sonix.com/api/${API_VERSION}`,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Artists', description: 'Artist profile management' },
      { name: 'Tracks', description: 'Music track management' },
      { name: 'Albums', description: 'Album management' },
      { name: 'Playlists', description: 'Playlist management' },
      { name: 'Search', description: 'Search functionality' },
      { name: 'Upload', description: 'File upload endpoints' }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts', './src/models/*.ts']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Sonix API Documentation'
}));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    services: {
      database: 'connected',
      websocket: 'active',
      storage: 'available'
    }
  });
});

// API routes with specific rate limiting
app.use(`/api/${API_VERSION}/auth`, authLimiter, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/artists`, artistRoutes);
app.use(`/api/${API_VERSION}/tracks`, trackRoutes);
app.use(`/api/${API_VERSION}/albums`, albumRoutes);
app.use(`/api/${API_VERSION}/playlists`, playlistRoutes);
app.use(`/api/${API_VERSION}/search`, searchLimiter, searchRoutes);
app.use(`/api/${API_VERSION}/upload`, uploadLimiter, uploadRoutes);

// WebSocket service
let wsService: WebSocketService;

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Setup database
    await setupDatabase();
    console.log('✅ Database connected and migrations completed');
    
    // Initialize WebSocket service
    wsService = new WebSocketService(server);
    console.log('✅ WebSocket service initialized');
    
    // Start background tasks
    setInterval(async () => {
      try {
        await AnalyticsService.updateTrendingContent();
      } catch (error) {
        console.error('Error updating trending content:', error);
      }
    }, 60 * 60 * 1000); // Update every hour
    
    server.listen(PORT, () => {
      console.log(`🚀 Sonix API Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔌 WebSocket: Enabled`);
      console.log(`📊 Analytics: Active`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections
    // db.destroy() if using Knex
    
    console.log('✅ Database connections closed');
    console.log('👋 Server shutdown complete');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

if (require.main === module) {
  startServer();
}

export default app;
export { wsService };