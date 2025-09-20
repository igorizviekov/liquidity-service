import swaggerJsdoc from 'swagger-jsdoc';

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Liquidity Service API',
			version: '1.0.0',
			description: 'A microservice for calculating DEX liquidity and slippage',
			license: {
				name: 'MIT',
			},
		},
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'Development server',
			},
		],
		components: {
			schemas: {
				LiquidityResponse: {
					type: 'object',
					required: ['sellToken', 'buyToken', 'chainId', 'quotes'],
					properties: {
						sellToken: {
							type: 'string',
							description: 'The normalized sell token address',
							example: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
						},
						buyToken: {
							type: 'string',
							description: 'The normalized buy token address',
							example: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
						},
						chainId: {
							type: 'integer',
							description: 'The EVM chain ID',
							example: 1,
							enum: [1, 137, 56, 42161],
						},
						quotes: {
							type: 'object',
							required: ['1%', '5%', '10%'],
							properties: {
								'1%': { $ref: '#/components/schemas/SlippageQuote' },
								'5%': { $ref: '#/components/schemas/SlippageQuote' },
								'10%': { $ref: '#/components/schemas/SlippageQuote' },
							},
						},
					},
				},
				SlippageQuote: {
					type: 'object',
					required: ['sellAmount', 'buyAmount'],
					properties: {
						sellAmount: {
							type: 'string',
							description:
								'Amount of sell token (formatted with proper decimals)',
							example: '1000.0',
						},
						buyAmount: {
							type: 'string',
							description:
								'Amount of buy token received (formatted with proper decimals)',
							example: '0.42',
						},
					},
				},
				HealthResponse: {
					type: 'object',
					required: ['status', 'timestamp', 'service'],
					properties: {
						status: {
							type: 'string',
							enum: ['ok', 'degraded'],
							description: 'Service health status',
						},
						timestamp: {
							type: 'string',
							format: 'date-time',
							description: 'ISO timestamp of the health check',
							example: '2025-09-20T10:30:00.000Z',
						},
						service: {
							type: 'string',
							example: 'liquidity-service',
						},
						rpcConnectivity: {
							type: 'string',
							enum: ['healthy', 'unhealthy'],
							description: 'Status of RPC connectivity',
						},
						latestBlock: {
							type: 'integer',
							description: 'Latest block number (only present when healthy)',
							example: 18500000,
						},
						cacheSize: {
							type: 'integer',
							description: 'Current cache size',
							example: 42,
						},
						error: {
							type: 'string',
							description: 'Error message (only present when degraded)',
							example: 'RPC timeout',
						},
					},
				},
				APIInfoResponse: {
					type: 'object',
					properties: {
						name: {
							type: 'string',
							example: 'Liquidity Service API',
						},
						description: {
							type: 'string',
							example:
								'A microservice for calculating DEX liquidity and slippage',
						},
						version: {
							type: 'string',
							example: '1.0.0',
						},
						endpoints: {
							type: 'object',
							properties: {
								'GET /liquidity': {
									type: 'object',
									properties: {
										description: { type: 'string' },
										parameters: { type: 'object' },
										example: { type: 'string' },
									},
								},
								'GET /health': {
									type: 'object',
									properties: {
										description: { type: 'string' },
									},
								},
							},
						},
						supportedChains: {
							type: 'object',
							properties: {
								'1': { type: 'string', example: 'Ethereum (Uniswap V2)' },
								'137': { type: 'string', example: 'Polygon (QuickSwap)' },
								'56': { type: 'string', example: 'BSC (PancakeSwap)' },
								'42161': { type: 'string', example: 'Arbitrum (SushiSwap)' },
							},
						},
					},
				},

				ErrorResponse: {
					type: 'object',
					required: ['error', 'message'],
					properties: {
						error: {
							type: 'string',
							description: 'Error type identifier',
						},
						message: {
							type: 'string',
							description: 'Human-readable error message',
						},
					},
				},
				MissingParametersError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Missing or invalid required parameters'],
								},
								message: {
									type: 'string',
									example:
										'sellToken, buyToken, and chainId are required and must be strings',
								},
								example: {
									type: 'string',
									example:
										'/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
								},
							},
						},
					],
				},
				InvalidChainIdError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Invalid chainId'],
								},
								message: {
									type: 'string',
									example: 'chainId must be a valid number',
								},
							},
						},
					],
				},
				UnsupportedChainError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Unsupported chain'],
								},
								message: {
									type: 'string',
									example: 'Chain ID 999 is not supported',
								},
								supportedChains: {
									type: 'array',
									items: {
										type: 'object',
										properties: {
											chainId: { type: 'integer' },
											name: { type: 'string' },
										},
									},
									example: [
										{ chainId: 1, name: 'Ethereum' },
										{ chainId: 137, name: 'Polygon' },
									],
								},
							},
						},
					],
				},
				InvalidTokenPairError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Invalid token pair'],
								},
								message: {
									type: 'string',
									example: 'sellToken and buyToken cannot be the same',
								},
							},
						},
					],
				},
				InvalidTokenAddressError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Invalid request'],
								},
								message: {
									type: 'string',
									examples: [
										'Invalid address format',
										'Invalid token contract: 0x... is not a valid ERC20 token',
										'Invalid token decimals: 255 for token 0x...',
									],
								},
							},
						},
					],
				},
				NoLiquidityError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Invalid request'],
								},
								message: {
									type: 'string',
									examples: [
										'No liquidity pool found for pair 0x.../0x... on chain Ethereum',
										'Liquidity pool for pair 0x.../0x... has zero reserves',
										'Insufficient liquidity for reliable pricing in pair 0x.../0x...',
									],
								},
							},
						},
					],
				},
				SlippageCalculationError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Invalid request'],
								},
								message: {
									type: 'string',
									example: 'Could not calculate quote for 10% slippage',
								},
							},
						},
					],
				},
				NetworkError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Service unavailable'],
								},
								message: {
									type: 'string',
									examples: [
										'RPC call failed: Cannot connect to Ethereum network',
										'Request timeout: Ethereum network is slow or unavailable',
									],
								},
							},
						},
					],
				},
				RateLimitError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Too many requests'],
								},
								message: {
									type: 'string',
									example: 'Please try again later',
								},
							},
						},
					],
				},
				InternalServerError: {
					allOf: [
						{ $ref: '#/components/schemas/ErrorResponse' },
						{
							type: 'object',
							properties: {
								error: {
									type: 'string',
									enum: ['Internal server error'],
								},
								message: {
									type: 'string',
									examples: [
										'An unexpected error occurred',
										'Something went wrong',
									],
								},
							},
						},
					],
				},
			},
		},
	},
	apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const specs = swaggerJsdoc(options);
