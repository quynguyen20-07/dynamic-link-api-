const express = require("express");
const shortid = require("shortid");
const UAParser = require("ua-parser-js");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*", // Chỉ allow từ Vite dev server
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

const links = new Map();

app.get("/health", (req, res) => {
  res.json({ status: 200, message: `OK - ${new Date().toISOString()} ` });
});

app.post("/create-link", (req, res) => {
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
  links.set(id, { iosUrl, androidUrl });
  const shortLink = `http://localhost:3000/link/${id}`;
  res.json({ shortLink, status: 200 });
});

app.get("/link/:id", (req, res) => {
  const { id } = req.params;
  const linkData = links.get(id);
  if (!linkData) {
    return res.status(404).send("Link not found");
  }

  const parser = new UAParser();
  const ua = parser.setUA(req.headers["user-agent"]).getResult();
  const os = ua.os.name?.toLowerCase();

  if (os?.includes("ios") || os?.includes("mac os")) {
    res.redirect(linkData.iosUrl);
  } else if (os?.includes("android")) {
    res.redirect(linkData.androidUrl);
  } else {
    res.redirect(linkData.androidUrl);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
