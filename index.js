const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (_req, res) => {
  res.send("PumpFun backend running");
});

// Main endpoint: proxy PumpPortal
app.get("/tokens", async (_req, res) => {
  try {
    const resp = await fetch("https://pumpportal.fun/api/data");
    if (!resp.ok) {
      return res
        .status(resp.status)
        .json({ error: "Failed to fetch from PumpPortal" });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    console.error("Error fetching tokens:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

