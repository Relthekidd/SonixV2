# API Connection Test Guide

## Quick Test Steps

After updating your `.env` file, follow these steps to verify your API connection:

### 1. Check Your Configuration
Open your `.env` file and ensure you've selected the correct API URL option.

### 2. Restart Your Development Server
```bash
# Stop the current server (Ctrl+C or Cmd+C)
# Then restart:
npm run dev
```

### 3. Test Connection Methods

#### Method A: Browser Test
Open your device/emulator browser and navigate to:
- `YOUR_API_URL/health` (replace with your actual API URL)
- Example: `http://192.168.1.100:3000/api/v1/health`

You should see a JSON response like:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Method B: Terminal Test
```bash
# Replace with your actual API URL
curl http://192.168.1.100:3000/api/v1/health
```

#### Method C: App Console Test
Check your app's console logs. You should see:
```
🌐 API Base URL: http://your-api-url
```

### 4. Common Configuration Options

Choose ONE of these based on your setup:

#### Local Backend Server
```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000/api/v1
```
Replace `YOUR_LOCAL_IP` with your machine's IP address.

#### Android Emulator + Local Backend
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
```

#### Production Backend (Railway/Heroku/etc.)
```env
EXPO_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
```

### 5. Troubleshooting

If you still get 404 errors:

1. **Verify Backend is Running**: Make sure your backend server is actually running
2. **Check Network**: Ensure your device and development machine are on the same network
3. **Firewall**: Allow port 3000 through your firewall
4. **CORS**: Ensure your backend allows requests from your app's origin

### 6. Finding Your Local IP Address

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address"

**macOS/Linux:**
```bash
ifconfig
# or
hostname -I
```

**Alternative (any OS):**
```bash
# Check your router's admin panel
# Usually at 192.168.1.1 or 192.168.0.1
```

### 7. Success Indicators

You'll know it's working when:
- ✅ Browser test shows health check response
- ✅ App console shows successful API requests
- ✅ No more "Network request failed" or "HTTP 404" errors
- ✅ App features that depend on the API start working

### 8. Next Steps

Once your API connection is working:
1. Test user registration/login
2. Test file uploads
3. Test other API endpoints your app uses

Remember: Every time you change the `.env` file, you must restart your Expo development server!