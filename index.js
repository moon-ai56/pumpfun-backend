const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (_req, res) => {
  res.send("DexScreener Solana backend running");
});

// Main endpoint: get Solana pairs from DexScreener search
app.get("/tokens", async (_req, res) => {
  try {
    // Use the official DexScreener search endpoint
    const url = "https://api.dexscreener.com/latest/dex/search?q=solana";
    const resp = await fetch(url);

    if (!resp.ok) {
      console.error("DexScreener HTTP error:", resp.status);
      return res
        .status(resp.status)
        .json({ error: "Failed to fetch from DexScreener search" });
    }

    const data = await resp.json();
    const pairs = data.pairs || [];

    // ✅ Only keep Solana chain AND skip the base SOL token itself
    const solPairs = pairs.filter((p) => {
      const isSolChain = p.chainId === "solana";
      const sym = p.baseToken?.symbol || "";
      const isNotMainSOL = sym.toUpperCase() !== "SOL";
      return isSolChain && isNotMainSOL;
    });

    // Normalize into a simple token list for your app
    const tokens = solPairs.map((p) => ({
      id: p.pairAddress,
      name: p.baseToken?.name || "",
      symbol: p.baseToken?.symbol || "",
      chainId: p.chainId,
      dexId: p.dexId,
      url: p.url,
      priceUsd: p.priceUsd,
      liquidityUsd: p.liquidity?.usd ?? 0,
      fdv: p.fdv ?? null,
      marketCap: p.marketCap ?? null,
      volume24h: p.volume?.h24 ?? null,
      txns24h: p.txns?.h24 ?? null,
      priceChange24h: p.priceChange?.h24 ?? null,
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


