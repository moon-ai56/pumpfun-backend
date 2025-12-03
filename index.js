const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- CONFIG ----------

// Helius RPC base URL (uses env var from Railway)
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Simple guard so we see a clear error if key is missing
if (!HELIUS_API_KEY) {
  console.warn(
    "⚠️ HELIUS_API_KEY is not set. /helius-* endpoints will fail until you add it in Railway."
  );
}

// ---------- ROUTES ----------

// Health check for your backend
app.get("/", (_req, res) => {
  res.send("PumpFun backend running (DexScreener + Helius)");
});

// 1) Existing DexScreener-powered tokens endpoint (for Vibecode UI)
app.get("/tokens", async (_req, res) => {
  try {
    // You can tweak this query later if you want different markets
    const resp = await fetch(
      "https://api.dexscreener.com/latest/dex/search?q=solana"
    );

    if (!resp.ok) {
      return res
        .status(resp.status)
        .json({ error: "Failed to fetch from DexScreener" });
    }

    const data = await resp.json();
    const pairs = data.pairs || [];

    // Keep only Solana chain, ignore the real SOL coin itself
    const solanaPairs = pairs.filter(
      (p) =>
        p.chainId === "solana" &&
        (p.baseToken?.name || "").toLowerCase() !== "solana"
    );

    const tokens = solanaPairs.map((p) => ({
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

// 2) Helius health check – proves your RPC works
app.get("/helius-health", async (_req, res) => {
  if (!HELIUS_RPC_URL) {
    return res
      .status(500)
      .json({ error: "HELIUS_API_KEY not set in environment" });
  }

  try {
    const body = {
      jsonrpc: "2.0",
      id: "health-check",
      method: "getHealth",
      params: [],
    };

    const resp = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await resp.json();
    return res.json(json);
  } catch (err) {
    console.error("Error calling Helius getHealth:", err);
    return res.status(500).json({ error: "Helius health check failed" });
  }
});

// 3) Helius demo – recent SOL transactions (for ML / raw data later)
app.get("/helius-txs", async (_req, res) => {
  if (!HELIUS_RPC_URL) {
    return res
      .status(500)
      .json({ error: "HELIUS_API_KEY not set in environment" });
  }

  try {
    // First: get recent signatures for the SOL mint address
    const signaturesBody = {
      jsonrpc: "2.0",
      id: "recent-sigs",
      method: "getSignaturesForAddress",
      params: [
        "So11111111111111111111111111111111111111112", // SOL mint
        { limit: 10 },
      ],
    };

    const sigResp = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signaturesBody),
    });

    const sigJson = await sigResp.json();
    const signatures = (sigJson.result || []).map((s) => s.signature);

    // Then: get parsed transactions for those signatures
    const txBody = {
      jsonrpc: "2.0",
      id: "parsed-txs",
      method: "getParsedTransactions",
      params: [signatures, { maxSupportedTransactionVersion: 0 }],
    };

    const txResp = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txBody),
    });

    const txJson = await txResp.json();

    return res.json({
      signatures,
      transactions: txJson.result || [],
    });
  } catch (err) {
    console.error("Error calling Helius txs:", err);
    return res.status(500).json({ error: "Helius tx fetch failed" });
  }
});

// ---------- START SERVER ----------

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


