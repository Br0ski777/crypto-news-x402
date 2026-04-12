import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "crypto-news",
  slug: "crypto-news",
  description: "Real-time crypto news aggregated from free sources with sentiment analysis.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/news",
      price: "$0.002",
      description: "Get latest crypto news with sentiment scores and token mentions",
      toolName: "crypto_get_latest_news",
      toolDescription:
        "Use this when you need latest crypto news and market-moving headlines. Returns articles with title, source, timestamp, sentiment score, mentioned tokens, and category. Aggregates from CoinGecko, CryptoPanic, and RSS feeds. Do NOT use for price data — use hyperliquid_get_market_data or dex_get_swap_quote. Do NOT use for historical candles — use token_get_ohlcv_history. Do NOT use for funding rates — use perp_scan_funding_arbitrage.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description:
              "Number of articles to return (default 20, max 100).",
          },
          token: {
            type: "string",
            description:
              "Filter by token symbol (e.g. BTC, ETH, SOL). Optional — returns all if omitted.",
          },
        },
        required: [],
      },
    },
  ],
};
