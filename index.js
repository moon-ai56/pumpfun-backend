const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (_req, res) => {
  res.send("Solana DexScreener backend running");
});

// Solana tokens only
app.get("/tokens", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    // Fetch ALL Solana pairs
    const resp = await fetch(
      "https://api.dexscreener.com/latest/dex/pairs/solana"
    );

    if (!resp.ok) {
      return res
        .status(resp.status)
        .json({ error: "Failed to fetch Solana pairs from DexScreener" });
    }

    const data = await resp.json();
    const pairs = data.pairs || [];

    // Filter rule:
    // - Base token is the token we want (not SOL)
    // - Quote token is SOL (pairs priced in SOL)
    const solanaTokens = pairs.filter(
      (p) =>
        p.quoteToken?.symbol === "SOL" &&
        p.baseToken?.symbol !== "SOL"
    );

    // Sort: newest first
    solanaTokens.sort(
      (a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0)
    );

    // Normalize for frontend
    const tokens = solanaTokens.map((p) => ({
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
    console.error("Backend error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

