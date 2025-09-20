# Liquidity Service

A lightweight microservice that calculates DEX liquidity and slippage, inspired by DefiLlama's liquidity tool.

## Supported Chains & DEXs

| Chain ID | Network  | DEX         | Factory Address                              |
| -------- | -------- | ----------- | -------------------------------------------- |
| 1        | Ethereum | Uniswap     | `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f` |
| 137      | Polygon  | QuickSwap   | `0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32` |
| 56       | BSC      | PancakeSwap | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` |
| 42161    | Arbitrum | SushiSwap   | `0xc35DADB65012eC5796536bD9864eD8773aBc74C4` |

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

The service will be available at `http://localhost:3000`

## API Documentation

### Swagger UI

Visit `http://localhost:3000/docs` for API documentation.

### Quick API Reference

### GET /liquidity

Calculate liquidity quotes with slippage for a token pair.

**Parameters:**

- `sellToken` (required): Token address to sell
- `buyToken` (required): Token address to buy
- `chainId` (required): EVM chain ID

**Example Request:**

```bash
curl "http://localhost:3000/liquidity?sellToken=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&buyToken=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&chainId=1"
```

**Example Response:**

```json
{
	"sellToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
	"buyToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
	"chainId": 1,
	"quotes": {
		"1%": { "sellAmount": "123.45", "buyAmount": "678.90" },
		"5%": { "sellAmount": "234.56", "buyAmount": "789.01" },
		"10%": { "sellAmount": "345.67", "buyAmount": "890.12" }
	}
}
```

### GET /health

Health check endpoint that verifies RPC connectivity and service status.

**Example Request:**

```bash
curl "http://localhost:3000/health"
```

**Healthy Response (200):**

```json
{
	"status": "ok",
	"timestamp": "2025-09-21T10:30:00.000Z",
	"service": "liquidity-service",
	"rpcConnectivity": "healthy",
	"latestBlock": 18500000,
	"cacheSize": 42
}
```

**Degraded Response (503):**

```json
{
	"status": "degraded",
	"timestamp": "2025-09-21T10:30:00.000Z",
	"service": "liquidity-service",
	"rpcConnectivity": "unhealthy",
	"error": "RPC timeout",
	"cacheSize": 0
}
```

## Examples

**WETH to UNI on Ethereum**

```bash
curl "http://localhost:3000/liquidity?sellToken=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&buyToken=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984&chainId=1"

```

**USDC to WETH on Arbitrum:**

```bash
curl "http://localhost:3000/liquidity?sellToken=0xaf88d065e77c8cC2239327C5EDb3A432268e5831&buyToken=0x82aF49447D8a07e3bd95BD0d56f35241523fBab1&chainId=42161"

```

**USDC to WBNB on BSC:**

```bash
curl "http://localhost:3000/liquidity?sellToken=0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d&buyToken=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c&chainId=56"

```

## Known Limitations

Stablecoin-to-stablecoin pairs (e.g., USDC/USDT, DAI/USDT) may show inflated slippage due to limited liquidity on Uniswap V2 pools.

## Configuration

Create a `.env` file for custom RPC endpoints:

```env
# Optional custom RPC URLs
ETHEREUM_RPC_URL=https://your-ethereum-rpc.com
POLYGON_RPC_URL=https://your-polygon-rpc.com
BSC_RPC_URL=https://your-bsc-rpc.com
ARBITRUM_RPC_URL=https://your-arbitrum-rpc.com

# Server configuration
PORT=3000
NODE_ENV=development
```

## Roadmap

**Short Term**:

- [ ] Uniswap V3 integration for better stablecoin pricing
- [ ] Multi-DEX price comparison and best route selection
- [ ] Adding support for more chains

**Medium Term**:

- [ ] Aggregated liquidity across multiple DEXs per chain
- [ ] WebSocket support for real-time price updates

**Long Term**:

- [ ] Cross-chain liquidity analysis
- [ ] MEV-aware routing
- [ ] Integration with major aggregators

## License

MIT License
