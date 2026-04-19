import type { Hono } from "hono";


// ATXP: requirePayment only fires inside an ATXP context (set by atxpHono middleware).
// For raw x402 requests, the existing @x402/hono middleware handles the gate.
// If neither protocol is active (ATXP_CONNECTION unset), tryRequirePayment is a no-op.
async function tryRequirePayment(price: number): Promise<void> {
  if (!process.env.ATXP_CONNECTION) return;
  try {
    const { requirePayment } = await import("@atxp/server");
    const BigNumber = (await import("bignumber.js")).default;
    await requirePayment({ price: BigNumber(price) });
  } catch (e: any) {
    if (e?.code === -30402) throw e;
  }
}

// --------------- Cache ---------------
interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 60 * 1000; // 60 seconds
const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// --------------- Types ---------------
interface Article {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  description: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  mentionedTokens: string[];
}

// --------------- Token matching ---------------
const TOP_TOKENS = [
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "DOT", "LINK", "MATIC",
  "UNI", "NEAR", "APT", "ARB", "OP", "SUI", "SEI", "TIA", "JUP", "WIF",
  "PEPE", "SHIB", "LTC", "BCH", "FIL", "ATOM", "ICP", "RENDER", "IMX", "INJ",
  "FET", "GRT", "STX", "MKR", "AAVE", "SNX", "CRV", "LDO", "RNDR", "ALGO",
  "HBAR", "VET", "MANA", "SAND", "AXS", "GALA", "ENS", "COMP", "SUSHI", "YFI",
  "BONK", "FLOKI", "TON", "TRX", "EOS", "XLM", "THETA", "FTM", "EGLD", "FLOW",
  "ROSE", "CFX", "KAVA", "ZIL", "ONE", "CELO", "MINA", "KSM", "ZEC", "DASH",
  "XMR", "NEO", "QTUM", "IOTA", "ENJ", "CHZ", "BAT", "1INCH", "ANKR", "CKB",
  "PENDLE", "EIGEN", "ETHFI", "W", "STRK", "BLAST", "ZRO", "PYTH", "JTO", "WLD",
  "TAO", "KAS", "ORDI", "RUNE", "BNB", "POL", "TRUMP", "AI16Z", "VIRTUAL", "FARTCOIN",
];

// Also match full names for common ones
const TOKEN_ALIASES: Record<string, string> = {
  BITCOIN: "BTC", ETHEREUM: "ETH", SOLANA: "SOL", RIPPLE: "XRP",
  DOGECOIN: "DOGE", CARDANO: "ADA", AVALANCHE: "AVAX", POLKADOT: "DOT",
  CHAINLINK: "LINK", POLYGON: "MATIC", UNISWAP: "UNI", LITECOIN: "LTC",
  TONCOIN: "TON", TRON: "TRX", BINANCE: "BNB",
};

function extractTokens(text: string): string[] {
  const upper = text.toUpperCase();
  const found = new Set<string>();

  for (const token of TOP_TOKENS) {
    // Match as whole word
    const regex = new RegExp(`\\b${token}\\b`);
    if (regex.test(upper)) {
      found.add(token);
    }
  }
  for (const [alias, symbol] of Object.entries(TOKEN_ALIASES)) {
    const regex = new RegExp(`\\b${alias}\\b`);
    if (regex.test(upper)) {
      found.add(symbol);
    }
  }
  return Array.from(found);
}

// --------------- Sentiment ---------------
const POSITIVE_WORDS = [
  "surge", "surges", "surging", "soar", "soars", "rally", "rallies", "bullish",
  "launch", "launches", "launched", "partnership", "partnerships", "upgrade",
  "adoption", "milestone", "record", "high", "gain", "gains", "breakout",
  "approve", "approved", "approval", "etf", "integration", "boom", "recovery",
  "institutional", "listing", "pump", "moon", "all-time",
];
const NEGATIVE_WORDS = [
  "crash", "crashes", "crashing", "hack", "hacked", "exploit", "exploited",
  "scam", "rug", "rugpull", "dump", "dumps", "dumping", "bearish", "plunge",
  "plunges", "drop", "drops", "fell", "fall", "falling", "decline", "ban",
  "banned", "lawsuit", "sec", "fine", "fined", "vulnerability", "attack",
  "bankrupt", "bankruptcy", "liquidation", "liquidated", "fraud",
];

function analyzeSentiment(title: string): { sentiment: "positive" | "negative" | "neutral"; score: number } {
  const lower = title.toLowerCase();
  let score = 0;

  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) score += 1;
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) score -= 1;
  }

  const clamped = Math.max(-1, Math.min(1, score / 3));
  const sentiment = clamped > 0.1 ? "positive" : clamped < -0.1 ? "negative" : "neutral";
  return { sentiment, score: parseFloat(clamped.toFixed(2)) };
}

// --------------- Fetchers ---------------

async function fetchCoinGeckoNews(): Promise<Article[]> {
  try {
    const resp = await fetch("https://api.coingecko.com/api/v3/news", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return [];

    const data: any = await resp.json();
    const items: any[] = data?.data || data || [];
    if (!Array.isArray(items)) return [];

    return items.slice(0, 50).map((item: any) => {
      const title = item.title || "";
      const { sentiment, score } = analyzeSentiment(title);
      return {
        title,
        source: item.news_site || item.author || "CoinGecko",
        url: item.url || "",
        publishedAt: item.updated_at || item.created_at || new Date().toISOString(),
        description: (item.description || "").slice(0, 300),
        sentiment,
        sentimentScore: score,
        mentionedTokens: extractTokens(title + " " + (item.description || "")),
      };
    });
  } catch {
    return [];
  }
}

async function fetchCryptoPanic(): Promise<Article[]> {
  try {
    const resp = await fetch(
      "https://cryptopanic.com/api/free/v1/posts/?auth_token=free&public=true",
      { headers: { Accept: "application/json" } }
    );
    if (!resp.ok) return [];

    const data: any = await resp.json();
    const results: any[] = data?.results || [];

    return results.slice(0, 50).map((item: any) => {
      const title = item.title || "";
      const { sentiment, score } = analyzeSentiment(title);
      return {
        title,
        source: item.source?.title || item.domain || "CryptoPanic",
        url: item.url || "",
        publishedAt: item.published_at || item.created_at || new Date().toISOString(),
        description: title, // CryptoPanic free endpoint only gives title
        sentiment,
        sentimentScore: score,
        mentionedTokens: extractTokens(title),
      };
    });
  } catch {
    return [];
  }
}

async function fetchRSSFeed(feedUrl: string, sourceName: string): Promise<Article[]> {
  try {
    const resp = await fetch(feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!resp.ok) return [];

    const xml = await resp.text();
    const articles: Article[] = [];

    // Simple XML parsing with regex (no external dep needed)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 30) {
      const block = match[1];

      const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const linkMatch = block.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = block.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/);

      const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
      if (!title) continue;

      const { sentiment, score } = analyzeSentiment(title);

      articles.push({
        title,
        source: sourceName,
        url: (linkMatch?.[1] || "").trim(),
        publishedAt: pubDateMatch?.[1] ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
        description: ((descMatch?.[1] || descMatch?.[2] || "").replace(/<[^>]*>/g, "")).slice(0, 300),
        sentiment,
        sentimentScore: score,
        mentionedTokens: extractTokens(title + " " + (descMatch?.[1] || descMatch?.[2] || "")),
      });
    }

    return articles;
  } catch {
    return [];
  }
}

// --------------- Main logic ---------------

async function getNews(limit: number, tokenFilter?: string): Promise<{
  articles: Article[];
  sources: string[];
  totalFetched: number;
}> {
  const cacheKey = `news_${tokenFilter || "all"}_${limit}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  // Try primary sources first
  const [cgArticles, cpArticles] = await Promise.all([
    fetchCoinGeckoNews(),
    fetchCryptoPanic(),
  ]);

  let allArticles = [...cgArticles, ...cpArticles];
  const sources: string[] = [];
  if (cgArticles.length > 0) sources.push("CoinGecko");
  if (cpArticles.length > 0) sources.push("CryptoPanic");

  // Fallback to RSS if both primary sources failed
  if (allArticles.length === 0) {
    const [ct, decrypt] = await Promise.all([
      fetchRSSFeed("https://cointelegraph.com/rss", "CoinTelegraph"),
      fetchRSSFeed("https://decrypt.co/feed", "Decrypt"),
    ]);
    allArticles = [...ct, ...decrypt];
    if (ct.length > 0) sources.push("CoinTelegraph");
    if (decrypt.length > 0) sources.push("Decrypt");
  }

  const totalFetched = allArticles.length;

  // Filter by token if requested
  if (tokenFilter) {
    const upper = tokenFilter.toUpperCase();
    allArticles = allArticles.filter(
      (a) => a.mentionedTokens.includes(upper)
    );
  }

  // Deduplicate by title (lowercase)
  const seen = new Set<string>();
  allArticles = allArticles.filter((a) => {
    const key = a.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by publishedAt descending
  allArticles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Apply limit
  allArticles = allArticles.slice(0, Math.min(limit, 100));

  const result = { articles: allArticles, sources, totalFetched };
  setCache(cacheKey, result);
  return result;
}

// --------------- Routes ---------------

export function registerRoutes(app: Hono) {
  app.get("/api/news", async (c) => {
    await tryRequirePayment(0.002);
    const limit = Math.min(parseInt(c.req.query("limit") || "20", 10) || 20, 100);
    const token = c.req.query("token") || undefined;

    try {
      const result = await getNews(limit, token);

      if (result.articles.length === 0) {
        return c.json({
          results: 0,
          sources: result.sources,
          tokenFilter: token?.toUpperCase() || "all",
          articles: [],
          message: token
            ? `No news found mentioning ${token.toUpperCase()}.`
            : "No news articles could be fetched from any source.",
        });
      }

      // Compute sentiment summary
      const pos = result.articles.filter((a) => a.sentiment === "positive").length;
      const neg = result.articles.filter((a) => a.sentiment === "negative").length;
      const neu = result.articles.filter((a) => a.sentiment === "neutral").length;

      return c.json({
        results: result.articles.length,
        sources: result.sources,
        totalFetched: result.totalFetched,
        tokenFilter: token?.toUpperCase() || "all",
        sentimentSummary: { positive: pos, negative: neg, neutral: neu },
        cachedFor: "60s",
        timestamp: new Date().toISOString(),
        articles: result.articles,
      });
    } catch (err: any) {
      return c.json({ error: "Failed to fetch crypto news", details: err.message }, 502);
    }
  });
}
