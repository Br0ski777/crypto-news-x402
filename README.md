# Crypto News Feed API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://crypto-news.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Real-time crypto news with sentiment scores and token mentions. Multi-source aggregation for trading signals. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "crypto-news": {
      "url": "https://crypto-news.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://crypto-news.api.klymax402.com/api/news"
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `crypto_get_latest_news` | GET | `/api/news` | $0.005 | Get latest crypto news with sentiment scores and token mentions |

### `crypto_get_latest_news`

Use this when you need the latest crypto news and market-moving headlines. Returns aggregated articles with sentiment in JSON.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `limit` | number | no | Number of articles to return (default 20, max 100). |
| `token` | string | no | Filter by token symbol (e.g. BTC, ETH, SOL). Optional — returns all if omitted. |

**Returns**

- `articles` -- array of news items with title, url, source, publishedAt
- `sentiment` -- sentiment score per article (-1 to +1, negative=bearish, positive=bullish)
- `mentionedTokens` -- array of token symbols mentioned in each article
- `category` -- article category (market, regulation, defi, nft, technology)
- `source` -- news source name (CoinGecko, CryptoPanic, RSS)

Example response:

```json
{"articles":[{"title":"ETH breaks $3,200 resistance","url":"https://...","source":"CryptoPanic","publishedAt":"2026-04-13T10:30:00Z","sentiment":0.72,"mentionedTokens":["ETH"],"category":"market"}],"total":20}
```

**When to use**: market sentiment analysis, news-driven trading signals, and staying updated on crypto events. Filter by token to get focused news.

**Not for**: price data (use `finance_get_token_price`), historical candles (use `token_get_ohlcv_history`), funding rates (use `perp_scan_funding_arbitrage`), whale movements (use `crypto_track_whale_transactions`).

## Example agent prompts

- "The latest crypto news and market-moving headlines"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
