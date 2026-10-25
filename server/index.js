import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { MongoClient } from "mongodb";

dotenv.config();
const PORT = Number(process.env.PORT || 3001);
const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true, service: "ProxiSpeak signaling server" }));
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const RADIUS = 100;
const users = new Map();
let mongoCollection = null;

async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    console.log("MongoDB URI not set — using in-memory presence for this demo.");
    return;
  }
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "proxispeak");
    mongoCollection = db.collection("presence");
    await mongoCollection.createIndex({ location: "2dsphere" });
    console.log("MongoDB connected; 2dsphere index ready.");
  } catch (err) {
    console.error("MongoDB connection failed; continuing in memory:", err.message);
  }
}

function snapshot() {
  return [...users.values()].map(({ id, name, x, y }) => ({ id, name, x, y }));
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
async function persistUser(user) {
  if (!mongoCollection) return;
  try {
    await mongoCollection.updateOne(
      { socketId: user.id },
      { $set: { socketId: user.id, name: user.name, x: user.x, y: user.y,
        location: { type: "Point", coordinates: [user.x, user.y] }, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) { console.error("Presence persistence error:", err.message); }
}
async function removePersistedUser(id) {
  if (!mongoCollection) return;
  try { await mongoCollection.deleteOne({ socketId: id }); } catch {}
}
function emitWorld() {
  const all = snapshot();
  io.emit("world:update", all);
  for (const user of users.values()) {
    const nearby = all.filter(other => other.id !== user.id &&
      distance(user, other) <= RADIUS);
    io.to(user.id).emit("proximity:update", {
      radius: RADIUS,
      nearby: nearby.map(p => ({ ...p, distance: Math.round(distance(user, p)) }))
    });
  }
}

io.on("connection", socket => {
  socket.emit("world:update", snapshot());

  socket.on("user:join", async payload => {
    const name = String(payload?.name || "Guest").trim().slice(0, 24) || "Guest";
    const user = { id: socket.id, name, x: 120 + Math.random() * 400, y: 100 + Math.random() * 250 };
    users.set(socket.id, user);
    await persistUser(user);
    emitWorld();
  });

  socket.on("user:move", async position => {
    const user = users.get(socket.id);
    if (!user) return;
    const x = Number(position?.x), y = Number(position?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    user.x = Math.max(18, Math.min(782, x));
    user.y = Math.max(18, Math.min(482, y));
    await persistUser(user);
    emitWorld();
  });

  // WebRTC signaling: server relays offer/answer/ICE only between peers.
  for (const event of ["webrtc:offer", "webrtc:answer", "webrtc:ice"]) {
    socket.on(event, ({ to, data }) => {
      if (!to || !users.has(to)) return;
      if (distance(users.get(socket.id) || {x:-9999,y:-9999}, users.get(to)) > RADIUS) return;
      io.to(to).emit(event, { from: socket.id, data });
    });
  }

  socket.on("disconnect", async () => {
    users.delete(socket.id);
    await removePersistedUser(socket.id);
    emitWorld();
  });
});

connectMongo().finally(() => {
  httpServer.listen(PORT, () => console.log(`ProxiSpeak server listening on http://localhost:${PORT}`));
});
