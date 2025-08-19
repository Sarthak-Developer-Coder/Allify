const express = require("express");
const connectDB = require("./db.js");
const cors = require("cors");
const http = require("http");
const fs = require('fs');
const path = require('path');
let DESIRED_PORT = parseInt(process.env.PORT, 10) || 5000;
const { initSocket } = require("./socket/index.js");
const { getIO } = require("./socket/index.js");
let EventReminder = null;
try {
  // Optional model; skip scheduler if not present
  EventReminder = require("./Models/EventReminder.js");
} catch (e) {
  console.warn("EventReminder model not found; skipping reminder scheduler");
}
const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests or tools with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/localhost:\d+$/i.test(origin)) return callback(null, true);
    return callback(null, true); // be permissive; tighten if needed
  },
  credentials: true,
}));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// Routes
app.get("/", (req, res) => {
  res.send("Hello World");
});
// Core routes (present in repo)
app.use("/auth", require("./Routes/auth_routes.js"));
app.use("/user", require("./Routes/userRoutes.js"));
app.use("/message", require("./Routes/message_routes.js"));
app.use("/conversation", require("./Routes/conversation_routes.js"));
app.use("/companion", require("./Routes/companion_routes.js"));

// Optional routes - mount only if file exists
const optionalRoutes = [
  ["/social", "social_routes.js"],
  ["/jobs", "jobs_routes.js"],
  ["/companies", "company_routes.js"],
  ["/games", "games_routes.js"],
  ["/notifications", "notifications_routes.js"],
  ["/portfolio", "portfolio_routes.js"],
  ["/meeting", "meeting_routes.js"],
  ["/music", "music_routes.js"],
  ["/snaps", "snap_routes.js"],
  ["/streaks", "streaks_routes.js"],
  ["/stories", "story_routes.js"],
  ["/friend", "friend_routes.js"],
  ["/memories", "memories_routes.js"],
  ["/reactions", "reactions_routes.js"],
  ["/spotlight", "spotlight_routes.js"],
  ["/map", "map_routes.js"],
  ["/admin", "admin_routes.js"],
  ["/push", "push_routes.js"],
];
optionalRoutes.forEach(([mount, file]) => {
  const full = path.join(__dirname, "Routes", file);
  if (fs.existsSync(full)) {
    try { app.use(mount, require(full)); } catch (e) { console.warn(`Failed to mount ${mount}:`, e.message); }
  }
});

// Serve HLS output under /hls static (best-effort); generated under backend/uploads/music/hls
app.use('/hls', express.static(path.join(__dirname, 'uploads', 'music', 'hls')));
// Serve generic media uploads (images/videos) for demo
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Server setup
const server = http.createServer(app);

// Socket.io setup
initSocket(server); // Initialize socket.io logic

function startServer(port) {
  // attach a one-time error handler for port binding issues
  server.once('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && !process.env.PORT) {
      const next = port + 1;
      if (next <= 5010) {
        console.warn(`⚠️ Port ${port} busy, retrying on ${next}...`);
        startServer(next);
        return;
      }
    }
    console.error('Server failed to start:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`🚀 Server started at http://localhost:${port}`);
    // connect DB and start background jobs once listening
    connectDB();
    // Simple event reminder scheduler (per minute)
    setInterval(async () => {
      try {
        const now = new Date();
        const upcoming = new Date(now.getTime() + 60 * 1000); // next 1 minute
        const events = await EventReminder.find({ alerted: false, startAt: { $lte: upcoming, $gte: now } });
        if (!events.length) return;
        const io = getIO();
        events.forEach(ev => {
          try { io.to(ev.user.toString()).emit('notification', { type: 'event-reminder', data: { text: `${ev.title} starts soon`, url: ev.url, startAt: ev.startAt } }); } catch {}
        });
        await EventReminder.updateMany({ _id: { $in: events.map(e => e._id) } }, { $set: { alerted: true } });
      } catch (e) { console.error('scheduler error', e); }
    }, 60 * 1000);
    // Purge expired snaps and stories hourly
    setInterval(async () => {
      try {
        const Snap = require('./Models/Snap');
        const Story = require('./Models/Story');
        const now = new Date();
        await Snap.deleteMany({ expiresAt: { $lte: now } });
        await Story.deleteMany({ expiresAt: { $lte: now } });
      } catch (e) { /* ignore */ }
    }, 60 * 60 * 1000);
  });
}

startServer(DESIRED_PORT);
