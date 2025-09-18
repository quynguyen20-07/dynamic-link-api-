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
  .connect(URI, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

const checkMongoConnection = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "MongoDB chưa sẵn sàng, thử lại sau nha!", code: 503 });
  }
  next();
};

// Schema cho link
const linkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  iosUrl: { type: String, required: true },
  androidUrl: { type: String, required: true },
});

const Link = mongoose.model("Link", linkSchema);

app.get("/health", (req, res) => {
  res.json({ status: 200, message: `OK - ${new Date().toISOString()}` });
});

app.post("/create-link", checkMongoConnection, async (req, res) => {
  const { iosUrl, androidUrl } = req.body;

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

    res.json({ shortLink, status: 200 });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server, thử lại nha!", code: 500 });
  }
});

app.get("/link/:id", checkMongoConnection, async (req, res) => {
  const { id } = req.params;
  const userAgent = req.headers["user-agent"] || "";

  try {
    const linkData = await Link.findOne({ id });
    if (!linkData) {
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


    if (os?.includes("ios") || os?.includes("mac os")) {
      res.redirect(linkData.iosUrl);
    } else if (os?.includes("android")) {
      res.redirect(linkData.androidUrl);
    } else {
      res.redirect(linkData.androidUrl);
    }
  } catch (err) {
    res.status(500).send("Lỗi server, thử lại nha!");
  }
});

// Port từ env (fallback 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port:${PORT}`);
  console.log("Test local at http://localhost:" + PORT + "/health");
});