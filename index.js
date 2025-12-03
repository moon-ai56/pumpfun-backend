const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (_req, res) => {
  res.send("DexScreener backend running");
});

// Main endpoint: proxy DexScreener
app.get("/tokens", async (_req, res) => {
  try {
    // Simple example: search pairs related to SOL
    const resp = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=SOL"
    );

    if (!resp.ok) {
      return res
        .status(resp.status)
        .json({ error: "Failed to fetch from DexScreener" });
    }

    const data = await resp.json();
    const pairs = data.pairs || [];

    // Normalize into a simpler shape for your app
    const tokens = pairs.map((p) => ({
      id: p.pairAddress,
      name: p.baseToken?.name || "",
      symbol: p.baseToken?.symbol || "",
      chainId: p.chainId,
      dexId: p.dexId,
      url: p.url,
      priceUsd: p.priceUsd,
      liquidityUsd: p.liquidity?.usd || 0,
      fdv: p.fdv ?? null,
      marketCap: p.marketCap ?? null,
      volume24h: p.volume?.h24 ?? null,
      txns24h: p.txns?.h24 ?? null,
      priceChange: p.priceChange ?? null,
      pairCreatedAt: p.pairCreatedAt ?? null,
    }));

    return res.json({ tokens });
  } catch (err) {
    console.error("Error fetching DexScreener data:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

