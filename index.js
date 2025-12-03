const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (_req, res) => {
  res.send("DexScreener Solana meme backend running");
});

// Solana meme tokens: base token != SOL, quoted in SOL
app.get("/tokens", async (_req, res) => {
  try {
    // Disable caching for live data
    res.set("Cache-Control", "no-store");

    // Search for SOL-related pairs on DexScreener
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

    // 🔥 Keep ONLY Solana-chain pairs where:
    // - chainId is "solana"
    // - quote token is SOL
    // - base token is NOT SOL (so it's the memecoin/alt)
    const solMemePairs = pairs.filter(
      (p) =>
        p.chainId === "solana" &&
        p.quoteToken?.symbol === "SOL" &&
        p.baseToken?.symbol !== "SOL"
    );

    // Sort newest first by pairCreatedAt
    solMemePairs.sort(
      (a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
    );

    const tokens = solMemePairs.map((p) => ({
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
      priceChange: p.priceChange ?? {},
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

