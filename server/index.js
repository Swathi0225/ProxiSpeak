
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";

dotenv.config();

const PORT = Number(process.env.PORT || 3001);
const RADIUS = 100;

const app = express();
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ProxiSpeak signaling server",
    connectedUsers: users.size,
    proximityRadius: RADIUS
  });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

const users = new Map();
let mongoClient = null;
let mongoCollection = null;

function snapshot() {
  return [...users.values()].map(({ id, name, x, y }) => ({
    id, name, x, y
  }));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getNearbyUsers(user) {
  return snapshot()
    .filter(other => other.id !== user.id)
    .map(other => ({
      ...other,
      distance: Math.round(distance(user, other))
    }))
    .filter(other => other.distance <= RADIUS);
}

async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    console.log(
      "MongoDB URI not set — using in-memory presence."
    );
    return;
  }

  try {
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();

    const db = mongoClient.db(
      process.env.MONGODB_DB || "proxispeak"
    );

    mongoCollection = db.collection("presence");

    await mongoCollection.createIndex({
      location: "2dsphere"
    });

    console.log("MongoDB connected; 2dsphere index ready.");
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
    mongoCollection = null;
  }
}

async function persistUser(user) {
  if (!mongoCollection) return;

  try {
    await mongoCollection.updateOne(
      { socketId: user.id },
      {
        $set: {
          socketId: user.id,
          name: user.name,
          x: user.x,
          y: user.y,
          location: {
            type: "Point",
            coordinates: [user.x, user.y]
          },
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Presence persistence error:", error.message);
  }
}

async function removePersistedUser(id) {
  if (!mongoCollection) return;

  try {
    await mongoCollection.deleteOne({ socketId: id });
  } catch (error) {
    console.error("Presence cleanup error:", error.message);
  }
}

function emitWorld() {
  const allUsers = snapshot();

  io.emit("world:update", allUsers);

  for (const user of users.values()) {
    io.to(user.id).emit("proximity:update", {
      radius: RADIUS,
      nearby: getNearbyUsers(user)
    });
  }
}

io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  socket.emit("world:update", snapshot());

  socket.on("user:join", async payload => {
    const name = String(payload?.name || "Guest")
      .trim()
      .slice(0, 24) || "Guest";

    // Avoid creating duplicate user records for one socket.
    if (users.has(socket.id)) {
      const existing = users.get(socket.id);
      existing.name = name;
      await persistUser(existing);
      emitWorld();
      return;
    }

    const user = {
      id: socket.id,
      name,
      x: 120 + Math.random() * 400,
      y: 100 + Math.random() * 250
    };

    users.set(socket.id, user);

    console.log(`${name} joined (${socket.id})`);

    await persistUser(user);
    emitWorld();
  });

  socket.on("user:move", async position => {
    const user = users.get(socket.id);
    if (!user) return;

    const x = Number(position?.x);
    const y = Number(position?.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    user.x = Math.max(18, Math.min(782, x));
    user.y = Math.max(18, Math.min(482, y));

    await persistUser(user);
    emitWorld();
  });

  const signalingEvents = [
    "webrtc:offer",
    "webrtc:answer",
    "webrtc:ice"
  ];

  for (const eventName of signalingEvents) {
    socket.on(eventName, payload => {
      const fromUser = users.get(socket.id);
      const to = payload?.to;
      const toUser = users.get(to);

      if (!fromUser || !toUser || socket.id === to) {
        return;
      }

      const separation = distance(fromUser, toUser);

      if (separation > RADIUS) {
        console.log(
          `Blocked ${eventName}: users are ${Math.round(separation)}px apart`
        );
        return;
      }

      io.to(to).emit(eventName, {
        from: socket.id,
        data: payload.data
      });
    });
  }

  socket.on("disconnect", async () => {
    const user = users.get(socket.id);

    users.delete(socket.id);
    await removePersistedUser(socket.id);

    if (user) {
      console.log(`${user.name} disconnected`);
    }

    emitWorld();
  });
});

connectMongo().finally(() => {
  httpServer.listen(PORT, () => {
    console.log(
      `ProxiSpeak server listening on http://localhost:${PORT}`
    );
  });
});
