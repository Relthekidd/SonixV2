# Network Request Failed - Troubleshooting Guide

## Overview
You're experiencing "Network request failed" errors when calling `/auth/register` in your React Native app. This guide will help you systematically identify and fix the issue.

## Step 1: Verify Backend Server is Running

### Check if your backend server is running:
```bash
cd server
npm run dev
```

You should see output like:
```
🚀 Sonix API Server running on port 3000
📚 API Documentation: http://localhost:3000/api-docs
🏥 Health Check: http://localhost:3000/health
```

### Test the health endpoint:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

## Step 2: Find Your Local IP Address

The issue is likely that your app is trying to connect to `localhost:3000`, but when running on a device/emulator, `localhost` doesn't resolve to your development machine.

### Find your IP address:

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**macOS/Linux:**
```bash
ifconfig
# or
ip addr show
```
Look for your network interface's inet address (usually starts with 192.168.x.x or 10.x.x.x).

**Alternative method:**
```bash
# On macOS/Linux
hostname -I
```

## Step 3: Update Environment Configuration

Update your `.env` file with your actual IP address:

```env
# Replace 192.168.1.100 with your actual IP address
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api/v1
```

**Important:** Restart your Expo development server after changing the `.env` file:
```bash
# Stop the current server (Ctrl+C) then restart
npm run dev
```

## Step 4: Test API Endpoints Directly

### Test the register endpoint with curl:
```bash
# Replace with your actual IP address
curl -X POST http://192.168.1.100:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

### Test with Postman:
1. Open Postman
2. Create a new POST request
3. URL: `http://YOUR_IP:3000/api/v1/auth/register`
4. Headers: `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123",
  "displayName": "Test User"
}
```

## Step 5: Check Database Connection

Your backend needs a working database connection. Verify:

### Check database configuration:
```bash
cd server
# Check if .env file exists and has correct database settings
cat .env
```

### Test database connection:
```bash
cd server
npm run migrate
```

If migrations fail, check your database configuration in `server/.env`.

## Step 6: Enable Detailed Logging

### Add network debugging to your app:

Create a debug version of your API service:

```typescript
// services/api-debug.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiServiceDebug {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log('📡 API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Success:', data);
      return data.data || data;
    } catch (error) {
      console.error('🚨 Network Error:', {
        message: error.message,
        stack: error.stack,
        url,
        endpoint
      });
      throw error;
    }
  }

  async register(email: string, password: string, displayName: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  }
}

export const apiServiceDebug = new ApiServiceDebug();
```

Use this debug service temporarily to get detailed logs.

## Step 7: Check Firewall and Network Settings

### Windows Firewall:
1. Open Windows Defender Firewall
2. Allow Node.js through the firewall
3. Ensure port 3000 is not blocked

### macOS Firewall:
1. System Preferences > Security & Privacy > Firewall
2. Add Node.js to allowed applications

### Router/Network:
- Ensure your device and development machine are on the same network
- Some corporate networks block certain ports

## Step 8: Platform-Specific Debugging

### For iOS Simulator:
iOS Simulator should be able to reach `localhost` directly, but try the IP address anyway.

### For Android Emulator:
Android emulator maps `10.0.2.2` to the host machine's `localhost`:
```env
# For Android emulator specifically
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
```

### For Physical Devices:
Must use the actual IP address of your development machine.

## Step 9: Verify CORS Configuration

Check your backend CORS settings in `server/src/server.ts`:

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:19006', 'http://192.168.1.100:19006'],
  credentials: true
}));
```

Add your IP address to the allowed origins.

## Step 10: Test Network Connectivity

### Simple connectivity test:
```bash
# From your development machine, test if the port is accessible
telnet YOUR_IP 3000
```

### From your device/emulator:
Open a browser on your device and navigate to:
`http://YOUR_IP:3000/health`

You should see the health check response.

## Common Solutions Summary

1. **Most Common:** Update `.env` with your actual IP address instead of `localhost`
2. **Android Emulator:** Use `10.0.2.2:3000` instead of `localhost:3000`
3. **Firewall:** Allow Node.js and port 3000 through your firewall
4. **Network:** Ensure device and development machine are on same network
5. **Backend:** Verify your backend server is running and database is connected
6. **CORS:** Add your IP address to allowed origins in backend

## Quick Fix Checklist

- [ ] Backend server is running (`npm run dev` in server directory)
- [ ] Database is connected (migrations run successfully)
- [ ] `.env` file updated with actual IP address (not localhost)
- [ ] Expo dev server restarted after `.env` change
- [ ] Firewall allows Node.js and port 3000
- [ ] Device and development machine on same network
- [ ] CORS configured to allow your IP address
- [ ] Health endpoint accessible from device browser

## Still Having Issues?

If you're still experiencing problems:

1. Share the exact error message and logs
2. Confirm your IP address and network setup
3. Test the health endpoint from your device's browser
4. Check if other network requests work from your app
5. Try using the debug API service for detailed logging