import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { LiquidityService } from '../services/liquidityService';
import { LiquidityRequest } from '../types';
import { ethers } from 'ethers';
import { CHAIN_CONFIGS } from '../config/chains';
import {
	isClientError,
	isNetworkError,
	HTTP_STATUS,
	ERROR_TYPES,
	CACHE_CONFIG,
	RATE_LIMIT_CONFIG,
	TIMEOUT_CONFIG,
} from '../constants';
import { logInfo, logError } from '../utils/logger';
import { getErrorMessage } from '../utils/error';
import { withTimeout } from '../utils/timeout';
import { SimpleCache } from '../utils/cache';

const router = Router();
const liquidityService = new LiquidityService();

const limiter = rateLimit({
	windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
	max: RATE_LIMIT_CONFIG.MAX_REQUESTS,
	message: {
		error: ERROR_TYPES.TOO_MANY_REQUESTS,
		message: 'Please try again later',
	},
	standardHeaders: true,
	legacyHeaders: false,
});

const cache = new SimpleCache<any>(CACHE_CONFIG.MAX_SIZE, CACHE_CONFIG.TTL);

const isValidParam = (param: unknown): param is string => {
	return typeof param === 'string' && param.length > 0;
};

/**
 * @swagger
 * /liquidity:
 *   get:
 *     summary: Calculate liquidity quotes with slippage
 *     description: |
 *       Calculates buy/sell amounts for token pairs at 1%, 5%, and 10% slippage levels.
 *       Uses DEX factory contracts to find liquidity pools and router contracts for price calculations.
 *
 *       **Supported DEXs by Chain:**
 *       - Ethereum (1): Uniswap V2
 *       - Polygon (137): QuickSwap
 *       - BSC (56): PancakeSwap
 *       - Arbitrum (42161): SushiSwap
 *     tags:
 *       - Liquidity
 *     parameters:
 *       - name: sellToken
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           description: Token contract address to sell (must be valid ERC20)
 *           example: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
 *       - name: buyToken
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^0x[a-fA-F0-9]{40}$'
 *           description: Token contract address to buy (must be valid ERC20)
 *           example: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
 *       - name: chainId
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [1, 137, 56, 42161]
 *           description: EVM chain ID
 *           example: 1
 *     responses:
 *       200:
 *         description: Liquidity quotes calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiquidityResponse'
 *             examples:
 *               usdc_eth:
 *                 summary: USDC to ETH on Ethereum
 *                 value:
 *                   sellToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
 *                   buyToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
 *                   chainId: 1
 *                   quotes:
 *                     "1%":
 *                       sellAmount: "1000.0"
 *                       buyAmount: "0.42"
 *                     "5%":
 *                       sellAmount: "5000.0"
 *                       buyAmount: "2.1"
 *                     "10%":
 *                       sellAmount: "10000.0"
 *                       buyAmount: "4.2"
 *       400:
 *         description: Bad Request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/MissingParametersError'
 *                 - $ref: '#/components/schemas/InvalidChainIdError'
 *                 - $ref: '#/components/schemas/UnsupportedChainError'
 *                 - $ref: '#/components/schemas/InvalidTokenPairError'
 *                 - $ref: '#/components/schemas/InvalidTokenAddressError'
 *                 - $ref: '#/components/schemas/NoLiquidityError'
 *                 - $ref: '#/components/schemas/SlippageCalculationError'
 *             examples:
 *               missing_params:
 *                 summary: Missing required parameters
 *                 value:
 *                   error: "Missing or invalid required parameters"
 *                   message: "sellToken, buyToken, and chainId are required and must be strings"
 *                   example: "/liquidity?sellToken=0x...&buyToken=0x...&chainId=1"
 *               invalid_chain:
 *                 summary: Invalid chain ID format
 *                 value:
 *                   error: "Invalid chainId"
 *                   message: "chainId must be a valid number"
 *               unsupported_chain:
 *                 summary: Unsupported chain
 *                 value:
 *                   error: "Unsupported chain"
 *                   message: "Chain ID 999 is not supported"
 *                   supportedChains:
 *                     - chainId: 1
 *                       name: "Ethereum"
 *                     - chainId: 137
 *                       name: "Polygon"
 *               same_tokens:
 *                 summary: Identical sell and buy tokens
 *                 value:
 *                   error: "Invalid token pair"
 *                   message: "sellToken and buyToken cannot be the same"
 *               invalid_address:
 *                 summary: Invalid token address
 *                 value:
 *                   error: "Invalid request"
 *                   message: "Invalid address format"
 *               no_pool:
 *                 summary: No liquidity pool exists
 *                 value:
 *                   error: "Invalid request"
 *                   message: "No liquidity pool found for pair 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 on chain Ethereum"
 *               insufficient_liquidity:
 *                 summary: Insufficient liquidity
 *                 value:
 *                   error: "Invalid request"
 *                   message: "Insufficient liquidity for reliable pricing in pair 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
 *       429:
 *         description: Too Many Requests - Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *             example:
 *               error: "Too many requests"
 *               message: "Please try again later"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerError'
 *             example:
 *               error: "Internal server error"
 *               message: "An unexpected error occurred"
 *       503:
 *         description: Service Unavailable - Network/RPC issues
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NetworkError'
 *             examples:
 *               rpc_failed:
 *                 summary: RPC connection failed
 *                 value:
 *                   error: "Service unavailable"
 *                   message: "RPC call failed: Cannot connect to Ethereum network"
 *               timeout:
 *                 summary: Network timeout
 *                 value:
 *                   error: "Service unavailable"
 *                   message: "Request timeout: Ethereum network is slow or unavailable"
 */
router.get('/liquidity', limiter, async (req: Request, res: Response) => {
	const startTime = Date.now();
	const { sellToken, buyToken, chainId } = req.query;

	logInfo(`Liquidity request: ${sellToken} -> ${buyToken} on chain ${chainId}`);

	try {
		if (
			!isValidParam(sellToken) ||
			!isValidParam(buyToken) ||
			!isValidParam(chainId)
		) {
			return res.status(HTTP_STATUS.BAD_REQUEST).json({
				error: ERROR_TYPES.MISSING_PARAMETERS,
				message:
					'sellToken, buyToken, and chainId are required and must be strings',
				example: '/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
			});
		}

		const chainIdNum = parseInt(chainId);
		if (isNaN(chainIdNum)) {
			return res.status(HTTP_STATUS.BAD_REQUEST).json({
				error: ERROR_TYPES.INVALID_CHAIN_ID,
				message: 'chainId must be a valid number',
			});
		}

		const supportedChainIds = Object.keys(CHAIN_CONFIGS).map(Number);
		if (!supportedChainIds.includes(chainIdNum)) {
			return res.status(HTTP_STATUS.BAD_REQUEST).json({
				error: ERROR_TYPES.UNSUPPORTED_CHAIN,
				message: `Chain ID ${chainIdNum} is not supported`,
				supportedChains: supportedChainIds.map((id) => ({
					chainId: id,
					name: CHAIN_CONFIGS[id].name,
				})),
			});
		}

		const cacheKey = `${sellToken.toLowerCase()}-${buyToken.toLowerCase()}-${chainIdNum}`;
		const cached = cache.get(cacheKey);
		if (cached) {
			logInfo(`Cache hit for ${cacheKey}`);
			return res.json(cached);
		}

		const request: LiquidityRequest = {
			sellToken,
			buyToken,
			chainId: chainIdNum,
		};

		const quotes = await liquidityService.getLiquidityQuotes(request);
		cache.set(cacheKey, quotes);

		logInfo(`Request completed in ${Date.now() - startTime}ms`);

		res.json(quotes);
	} catch (error) {
		logError(`Request failed in ${Date.now() - startTime}ms:`, error);

		if (error instanceof Error) {
			let statusCode: number;
			let errorType: string;

			if (isClientError(error)) {
				statusCode = HTTP_STATUS.BAD_REQUEST;
				errorType = ERROR_TYPES.INVALID_REQUEST;
			} else if (isNetworkError(error)) {
				statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
				errorType = ERROR_TYPES.SERVICE_UNAVAILABLE;
			} else {
				statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
				errorType = ERROR_TYPES.INTERNAL_SERVER_ERROR;
			}

			return res.status(statusCode).json({
				error: errorType,
				message: error.message,
			});
		}

		res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
			error: ERROR_TYPES.INTERNAL_SERVER_ERROR,
			message: getErrorMessage(error, 'An unexpected error occurred'),
		});
	}
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: |
 *       Checks the health status of the service and its dependencies.
 *       Tests RPC connectivity to Ethereum mainnet and returns cache statistics.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "ok"
 *               timestamp: "2025-09-20T10:30:00.000Z"
 *               service: "liquidity-service"
 *               rpcConnectivity: "healthy"
 *               latestBlock: 18500000
 *               cacheSize: 42
 *       503:
 *         description: Service is degraded or unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             examples:
 *               rpc_timeout:
 *                 summary: RPC connection timeout
 *                 value:
 *                   status: "degraded"
 *                   timestamp: "2025-09-20T10:30:00.000Z"
 *                   service: "liquidity-service"
 *                   rpcConnectivity: "unhealthy"
 *                   error: "RPC timeout"
 *                   cacheSize: 42
 *               rpc_error:
 *                 summary: RPC connection error
 *                 value:
 *                   status: "degraded"
 *                   timestamp: "2025-09-20T10:30:00.000Z"
 *                   service: "liquidity-service"
 *                   rpcConnectivity: "unhealthy"
 *                   error: "Network connection failed"
 *                   cacheSize: 0
 */
router.get('/health', async (req: Request, res: Response) => {
	try {
		const provider = new ethers.providers.JsonRpcProvider(
			process.env.ETHEREUM_RPC_URL || 'https://ethereum.publicnode.com'
		);

		const blockNumber = await withTimeout(
			provider.getBlockNumber(),
			TIMEOUT_CONFIG.HEALTH_CHECK_TIMEOUT,
			'RPC timeout'
		);

		res.status(HTTP_STATUS.OK).json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			service: 'liquidity-service',
			rpcConnectivity: 'healthy',
			latestBlock: blockNumber,
			cacheSize: cache.size(),
		});
	} catch (error) {
		res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
			status: 'degraded',
			timestamp: new Date().toISOString(),
			service: 'liquidity-service',
			rpcConnectivity: 'unhealthy',
			error: getErrorMessage(error, 'Unknown error'),
			cacheSize: cache.size(),
		});
	}
});

export default router;
