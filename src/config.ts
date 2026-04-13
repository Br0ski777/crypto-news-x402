import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "crypto-news",
  slug: "crypto-news",
  description: "Real-time crypto news with sentiment scores and token mentions. Multi-source aggregation for trading signals.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/news",
      price: "$0.002",
      description: "Get latest crypto news with sentiment scores and token mentions",
      toolName: "crypto_get_latest_news",
      toolDescription: `Use this when you need the latest crypto news and market-moving headlines. Returns aggregated articles with sentiment in JSON.

1. articles: array of news items with title, url, source, publishedAt
2. sentiment: sentiment score per article (-1 to +1, negative=bearish, positive=bullish)
3. mentionedTokens: array of token symbols mentioned in each article
4. category: article category (market, regulation, defi, nft, technology)
5. source: news source name (CoinGecko, CryptoPanic, RSS)

Example output: {"articles":[{"title":"ETH breaks $3,200 resistance","url":"https://...","source":"CryptoPanic","publishedAt":"2026-04-13T10:30:00Z","sentiment":0.72,"mentionedTokens":["ETH"],"category":"market"}],"total":20}

Use this FOR market sentiment analysis, news-driven trading signals, and staying updated on crypto events. Filter by token to get focused news.

Do NOT use for price data -- use finance_get_token_price instead. Do NOT use for historical candles -- use token_get_ohlcv_history instead. Do NOT use for funding rates -- use perp_scan_funding_arbitrage instead. Do NOT use for whale movements -- use crypto_track_whale_transactions instead.`,
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
