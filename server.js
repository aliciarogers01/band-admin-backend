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
const visualEditsRoutes = require("./routes/visual-edits");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
app.use("/api/visual-edits", visualEditsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});