# Sonix Music API

A comprehensive backend API for the Sonix music streaming application built with Node.js, Express, PostgreSQL, and AWS S3.

## Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Music Management**: Complete CRUD operations for tracks, albums, playlists, and artist profiles
- **File Upload**: AWS S3 integration for audio files and images
- **Search Functionality**: Full-text search across tracks, artists, albums, and playlists
- **User Interactions**: Follow/unfollow users, like tracks, create playlists
- **Security**: Rate limiting, input validation, secure file uploads
- **Documentation**: Comprehensive Swagger/OpenAPI documentation

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Knex.js ORM
- **File Storage**: AWS S3
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi and express-validator
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate limiting

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- AWS Account with S3 access
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/sonix_db
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   
   # AWS S3
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=sonix-music-files
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb sonix_db
   
   # Run migrations
   npm run migrate
   
   # Seed database (optional)
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/change-password` - Change password

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `POST /api/v1/users/:id/follow` - Follow user
- `DELETE /api/v1/users/:id/unfollow` - Unfollow user
- `GET /api/v1/users/liked-tracks` - Get liked tracks

### Artists
- `GET /api/v1/artists` - Get all artists
- `POST /api/v1/artists/profile` - Create artist profile
- `GET /api/v1/artists/:id` - Get artist by ID
- `GET /api/v1/artists/:id/tracks` - Get artist tracks

### Tracks
- `GET /api/v1/tracks` - Get all tracks
- `GET /api/v1/tracks/trending` - Get trending tracks
- `GET /api/v1/tracks/recent` - Get recent releases
- `GET /api/v1/tracks/:id` - Get track by ID
- `POST /api/v1/tracks` - Create new track
- `PUT /api/v1/tracks/:id` - Update track
- `DELETE /api/v1/tracks/:id` - Delete track
- `POST /api/v1/tracks/:id/play` - Record play

### Albums
- `GET /api/v1/albums` - Get all albums
- `GET /api/v1/albums/:id` - Get album by ID
- `POST /api/v1/albums` - Create new album

### Playlists
- `GET /api/v1/playlists` - Get public playlists
- `GET /api/v1/playlists/:id` - Get playlist by ID
- `POST /api/v1/playlists` - Create new playlist
- `POST /api/v1/playlists/:id/tracks` - Add track to playlist

### Search
- `GET /api/v1/search` - Search across all content
- `GET /api/v1/search/suggestions` - Get search suggestions
- `GET /api/v1/search/trending` - Get trending searches

### Upload
- `POST /api/v1/upload/audio` - Upload audio file
- `POST /api/v1/upload/image` - Upload image file

## Database Schema

### Users
- User authentication and profile information
- Role-based access (listener, artist, admin)
- Privacy settings and preferences

### Artists
- Artist profiles linked to user accounts
- Stage names, bio, social links
- Performance metrics

### Tracks
- Audio files with metadata
- Genre classification
- Play counts and engagement metrics

### Albums
- Collections of tracks
- Release information and artwork

### Playlists
- User-created track collections
- Public/private visibility
- Collaborative features

### Relationships
- User follows
- Track likes
- Playlist memberships
- Play history

## Security Features

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Comprehensive validation on all endpoints
- **File Upload Security**: Type validation and size limits
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers

## File Upload

The API supports secure file uploads to AWS S3:

- **Audio Files**: MP3, WAV, FLAC formats
- **Images**: JPEG, PNG formats for covers and avatars
- **Size Limits**: Configurable per file type
- **Organization**: Automatic folder structure in S3

## Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build TypeScript
npm run start        # Start production server
npm run test         # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database
```

### Database Migrations
```bash
# Create new migration
npx knex migrate:make migration_name

# Run migrations
npm run migrate

# Rollback migration
npm run migrate:rollback
```

## Deployment

### Environment Variables
Ensure all production environment variables are set:
- Database connection
- JWT secrets
- AWS credentials
- CORS origins

### Database
- Run migrations in production
- Set up connection pooling
- Configure backups

### File Storage
- Configure S3 bucket policies
- Set up CDN if needed
- Configure backup strategies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.