import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/models/User';

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://your-frontend-domain.com'] 
          : ['http://localhost:3000', 'http://localhost:19006'],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware for WebSocket connections
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await UserModel.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('Invalid token'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.display_name} connected`);

      // Store user connection
      this.connectedUsers.set(user.id, socket.id);

      // Join user to their personal room
      socket.join(`user:${user.id}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${user.display_name} disconnected`);
        this.connectedUsers.delete(user.id);
      });

      // Handle joining playlist rooms for collaborative playlists
      socket.on('join-playlist', (playlistId: string) => {
        socket.join(`playlist:${playlistId}`);
      });

      socket.on('leave-playlist', (playlistId: string) => {
        socket.leave(`playlist:${playlistId}`);
      });

      // Handle real-time music sharing
      socket.on('share-track', (data: { trackId: string; userId: string; message?: string }) => {
        this.shareTrack(user.id, data.trackId, data.userId, data.message);
      });

      // Handle live listening sessions
      socket.on('start-listening-session', (data: { trackId: string; timestamp: number }) => {
        socket.broadcast.emit('user-started-listening', {
          userId: user.id,
          userName: user.display_name,
          trackId: data.trackId,
          timestamp: data.timestamp
        });
      });
    });
  }

  // Notify user about new track uploads from followed artists
  public notifyNewTrackUpload(artistId: string, trackData: any) {
    this.io.emit('new-track-upload', {
      artistId,
      track: trackData,
      timestamp: new Date()
    });
  }

  // Notify about playlist updates
  public notifyPlaylistUpdate(playlistId: string, updateType: string, data: any) {
    this.io.to(`playlist:${playlistId}`).emit('playlist-updated', {
      playlistId,
      type: updateType,
      data,
      timestamp: new Date()
    });
  }

  // Share track between users
  public shareTrack(fromUserId: string, trackId: string, toUserId: string, message?: string) {
    const toSocketId = this.connectedUsers.get(toUserId);
    
    if (toSocketId) {
      this.io.to(toSocketId).emit('track-shared', {
        fromUserId,
        trackId,
        message,
        timestamp: new Date()
      });
    }
  }

  // Notify about new followers
  public notifyNewFollower(userId: string, followerData: any) {
    this.io.to(`user:${userId}`).emit('new-follower', {
      follower: followerData,
      timestamp: new Date()
    });
  }

  // Notify about track likes
  public notifyTrackLike(artistId: string, trackId: string, likerData: any) {
    this.io.to(`user:${artistId}`).emit('track-liked', {
      trackId,
      liker: likerData,
      timestamp: new Date()
    });
  }

  // Broadcast trending updates
  public broadcastTrendingUpdate(trendingData: any) {
    this.io.emit('trending-updated', {
      trending: trendingData,
      timestamp: new Date()
    });
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}