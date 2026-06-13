require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const showsRoutes = require("./routes/shows");
const messagesRoutes = require("./routes/messages");
const submissionsRoutes = require("./routes/submissions");
const settingsRoutes = require("./routes/settings");
const uploadsRoutes = require("./routes/uploads");
const mediaRoutes = require("./routes/media");
const sectionsRoutes = require("./routes/sections");
const visualPagesRoutes = require("./routes/visual-pages");
const visitorsRoutes = require("./routes/visitors");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", true);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5000",
  "https://driver8remband.com",
  "https://www.driver8remband.com",
  "https://weirdsciencefw.com",
  "https://www.weirdsciencefw.com",
  "https://graverobberpunk.com",
  "https://www.graverobberpunk.com",
  "https://aliciarogers01.github.io"
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "That update is too large to save. Try smaller media files or fewer embedded images, then publish again." });
    return;
  }

  next(error);
});

app.get("/", (req, res) => {
  res.send("Band admin backend is running.");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/shows", showsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/sections", sectionsRoutes);
app.use("/api/visual-pages", visualPagesRoutes);
app.use("/api/visitors", visitorsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
