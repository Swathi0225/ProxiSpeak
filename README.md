# ProxiSpeak — Review Prototype

A small, runnable prototype for tomorrow's review:
- Week 1: React Canvas virtual office, keyboard movement, Socket.IO live coordinate broadcasts.
- Week 2: server-side proximity calculation (100 px radius), nearby-user list, and WebRTC audio signaling.
- MongoDB geospatial persistence is optional; the app runs in demo mode without MongoDB.

## Requirements
- Node.js 20+ (check with `node -v` and `npm -v`)
- Two browser tabs/windows on the same computer for the demo
- Microphone permission for the WebRTC voice test

## Run
Open PowerShell in this folder:

```powershell
npm install
npm run install:all
npm run dev
```

Open the Vite URL shown in the terminal (normally http://localhost:5173) in two tabs.
Enter different display names and click **Join office** in both tabs.
Use **W A S D** or arrow keys to move. Move avatars close together to see the proximity status.
Click **Enable microphone** in both tabs and allow microphone access. Nearby peers may connect via WebRTC.
For the best audio test, use headphones and two separate browser windows; audio capture/playback can vary by browser.

## Optional MongoDB
Set `MONGODB_URI` in `server/.env` to a MongoDB connection string and restart the server.
The server creates a `presence` collection with a `2dsphere` index and stores current avatar positions.
Without `MONGODB_URI`, live presence and proximity still work in server memory.

## Review talking points
1. React Canvas draws the virtual office and avatars.
2. Socket.IO broadcasts movement to connected clients in real time.
3. The server calculates Euclidean distance and only marks users within 100 px as nearby.
4. MongoDB GeoJSON points and a `2dsphere` index are included as optional geospatial persistence.
5. WebRTC carries audio peer-to-peer; Socket.IO is used only for signaling.
6. This is a review prototype, not a production-ready 50-user deployment. Production work would add authentication, reconnect handling, TURN servers, robust audio lifecycle management, and load testing.
