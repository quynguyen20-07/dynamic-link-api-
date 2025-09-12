const express = require("express");
const shortid = require("shortid");
const UAParser = require("ua-parser-js");
const cors = require("cors");
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

const links = new Map();

// Health check
app.get("/health", (req, res) => {
  res.json({ status: 200, message: `OK - ${new Date().toISOString()}` });
});

// Tạo short link
app.post("/create-link", (req, res) => {
  const { iosUrl, androidUrl } = req.body;
  console.log("POST /create-link called with body:", req.body); // Debug

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
  links.set(id, { iosUrl, androidUrl });
  
  // Sử dụng BASE_URL từ env (fallback localhost nếu chưa set)
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const shortLink = `${baseUrl}/link/${id}`;
  
  console.log("Created shortLink:", shortLink); // Debug
  res.json({ shortLink, status: 200 });
});

// Redirect dựa trên OS
app.get("/link/:id", (req, res) => {
  const { id } = req.params;
  const userAgent = req.headers["user-agent"] || "";
  console.log("GET /link/:id called with ID:", id, "User-Agent:", userAgent.substring(0, 100) + "..."); // Debug (cắt ngắn UA)

  const linkData = links.get(id);
  if (!linkData) {
    console.log("Link not found for ID:", id);
    return res.status(404).send("Link not found");
  }

  // Detect OS với UAParser + fallback regex
  const parser = new UAParser();
  const uaResult = parser.setUA(userAgent).getResult();
  let os = uaResult.os.name?.toLowerCase();

  // Fallback regex nếu không detect được
  if (!os) {
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      os = "ios";
    } else if (/android/i.test(userAgent)) {
      os = "android";
    }
  }

  console.log("Detected OS:", os); // Debug

  if (os?.includes("ios") || os?.includes("mac os")) {
    console.log("Redirecting to iOS:", linkData.iosUrl);
    res.redirect(linkData.iosUrl);
  } else if (os?.includes("android")) {
    console.log("Redirecting to Android:", linkData.androidUrl);
    res.redirect(linkData.androidUrl);
  } else {
    // Fallback: Redirect Android (như code gốc của bạn)
    console.log("Fallback to Android:", linkData.androidUrl);
    res.redirect(linkData.androidUrl);
  }
});

// Port từ env (fallback 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port:${PORT}`);
  console.log("Test local at http://localhost:" + PORT + "/health");
});