const express = require("express");
const shortid = require("shortid");
const UAParser = require("ua-parser-js");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

const URI = process.env.MONGO_DATABASE_URI;
mongoose
  .connect(URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

// Schema cho link
const linkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  iosUrl: { type: String, required: true },
  androidUrl: { type: String, required: true },
});

const Link = mongoose.model("Link", linkSchema);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: 200, message: `OK - ${new Date().toISOString()}` });
});

// Tạo short link
app.post("/create-link", async (req, res) => {
  const { iosUrl, androidUrl } = req.body;
  console.log("POST /create-link called with body:", req.body);

  if (!iosUrl) {
    return res
      .status(400)
      .json({ message: "Ối dồi ôi bạn ơi thiếu iOS URL rùi!", code: 400 });
  }
  if (!androidUrl) {
    return res
      .status(400)
      .json({ message: "Ối dồi ôi bạn ơi thiếu Android URL rùi!", code: 400 });
  }

  const id = shortid.generate();
  try {
    await Link.create({ id, iosUrl, androidUrl });
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const shortLink = `${baseUrl}/link/${id}`;

    console.log("Created shortLink:", shortLink);
    res.json({ shortLink, status: 200 });
  } catch (err) {
    console.error("Error creating link:", err.message);
    res.status(500).json({ message: "Lỗi server, thử lại nha!", code: 500 });
  }
});

// Redirect dựa trên OS
app.get("/link/:id", async (req, res) => {
  const { id } = req.params;
  const userAgent = req.headers["user-agent"] || "";
  console.log("GET /link/:id called with ID:", id, "User-Agent:", userAgent.substring(0, 100) + "...");

  try {
    const linkData = await Link.findOne({ id });
    if (!linkData) {
      console.log("Link not found for ID:", id);
      return res.status(404).send("Link not found");
    }

    const parser = new UAParser();
    const uaResult = parser.setUA(userAgent).getResult();
    let os = uaResult.os.name?.toLowerCase();

    if (!os) {
      if (/iPad|iPhone|iPod/.test(userAgent)) {
        os = "ios";
      } else if (/android/i.test(userAgent)) {
        os = "android";
      }
    }

    console.log("Detected OS:", os);

    if (os?.includes("ios") || os?.includes("mac os")) {
      console.log("Redirecting to iOS:", linkData.iosUrl);
      res.redirect(linkData.iosUrl);
    } else if (os?.includes("android")) {
      console.log("Redirecting to Android:", linkData.androidUrl);
      res.redirect(linkData.androidUrl);
    } else {
      console.log("Fallback to Android:", linkData.androidUrl);
      res.redirect(linkData.androidUrl);
    }
  } catch (err) {
    console.error("Error fetching link:", err.message);
    res.status(500).send("Lỗi server, thử lại nha!");
  }
});

// Port từ env (fallback 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port:${PORT}`);
  console.log("Test local at http://localhost:" + PORT + "/health");
});