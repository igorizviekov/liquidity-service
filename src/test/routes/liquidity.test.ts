import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { agent } from 'supertest';
import express from 'express';
import router from '../../routes/liquidity';
import { ethers } from 'ethers';
import { ERROR_TYPES } from '../../constants';

vi.mock('../../services/liquidityService', () => ({
	LiquidityService: vi.fn().mockImplementation(() => ({
		getLiquidityQuotes: vi.fn(),
	})),
}));

vi.mock('../../config/chains', () => ({
	CHAIN_CONFIGS: {
		1: {
			rpcUrl: 'https://ethereum.publicnode.com',
			factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
			routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
			name: 'Ethereum',
		},
		137: {
			rpcUrl: 'https://polygon.publicnode.com',
			factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
			routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
			name: 'Polygon',
		},
	},
}));

vi.mock('ethers', () => ({
	ethers: {
		providers: {
			JsonRpcProvider: vi.fn().mockImplementation(() => ({
				getBlockNumber: vi.fn(),
			})),
		},
	},
}));

describe('Liquidity Routes', () => {
	let app: express.Application;

	beforeEach(() => {
		vi.clearAllMocks();
		app = express();
		app.use(express.json());
		app.use(router);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('GET /liquidity', () => {
		const validRequest = {
			sellToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
			buyToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
			chainId: '1',
		};

		it('should return 400 for missing sellToken parameter', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					buyToken: validRequest.buyToken,
					chainId: validRequest.chainId,
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.MISSING_PARAMETERS,
				message:
					'sellToken, buyToken, and chainId are required and must be strings',
				example: '/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
			});
		});

		it('should return 400 for missing buyToken parameter', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: validRequest.sellToken,
					chainId: validRequest.chainId,
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.MISSING_PARAMETERS,
				message:
					'sellToken, buyToken, and chainId are required and must be strings',
				example: '/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
			});
		});

		it('should return 400 for missing chainId parameter', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: validRequest.sellToken,
					buyToken: validRequest.buyToken,
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.MISSING_PARAMETERS,
				message:
					'sellToken, buyToken, and chainId are required and must be strings',
				example: '/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
			});
		});

		it('should return 400 for empty string parameters', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: '',
					buyToken: validRequest.buyToken,
					chainId: validRequest.chainId,
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.MISSING_PARAMETERS,
				message:
					'sellToken, buyToken, and chainId are required and must be strings',
				example: '/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
			});
		});

		it('should return 400 for invalid chainId format', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: validRequest.sellToken,
					buyToken: validRequest.buyToken,
					chainId: 'foo',
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.INVALID_CHAIN_ID,
				message: 'chainId must be a valid number',
			});
		});

		it('should return 400 for unsupported chainId', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: validRequest.sellToken,
					buyToken: validRequest.buyToken,
					chainId: '999',
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.UNSUPPORTED_CHAIN,
				message: 'Chain ID 999 is not supported',
				supportedChains: [
					{ chainId: 1, name: 'Ethereum' },
					{ chainId: 137, name: 'Polygon' },
				],
			});
		});

		it('should accept valid chainId 1', async () => {
			const response = await agent(app).get('/liquidity').query({
				sellToken: validRequest.sellToken,
				buyToken: validRequest.buyToken,
				chainId: '1',
			});
			expect(response.status).not.toBe(400);
		});

		it('should accept valid chainId 137', async () => {
			const response = await agent(app).get('/liquidity').query({
				sellToken: validRequest.sellToken,
				buyToken: validRequest.buyToken,
				chainId: '137',
			});
			expect(response.status).not.toBe(400);
		});

		it('should handle non-string parameters', async () => {
			const response = await agent(app).get('/liquidity').query({
				sellToken: 123,
				buyToken: validRequest.buyToken,
				chainId: validRequest.chainId,
			});
			expect(response.status).toBeDefined();
		});

		it('should handle null parameters', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: null,
					buyToken: validRequest.buyToken,
					chainId: validRequest.chainId,
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.MISSING_PARAMETERS,
				message:
					'sellToken, buyToken, and chainId are required and must be strings',
				example: '/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
			});
		});

		it('should handle undefined parameters', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: undefined,
					buyToken: validRequest.buyToken,
					chainId: validRequest.chainId,
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.MISSING_PARAMETERS,
				message:
					'sellToken, buyToken, and chainId are required and must be strings',
				example: '/liquidity?sellToken=0x...&buyToken=0x...&chainId=1',
			});
		});

		it('should handle negative chainId', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: validRequest.sellToken,
					buyToken: validRequest.buyToken,
					chainId: '-1',
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.UNSUPPORTED_CHAIN,
				message: 'Chain ID -1 is not supported',
				supportedChains: [
					{ chainId: 1, name: 'Ethereum' },
					{ chainId: 137, name: 'Polygon' },
				],
			});
		});

		it('should handle zero chainId', async () => {
			const response = await agent(app)
				.get('/liquidity')
				.query({
					sellToken: validRequest.sellToken,
					buyToken: validRequest.buyToken,
					chainId: '0',
				})
				.expect(400);
			expect(response.body).toEqual({
				error: ERROR_TYPES.UNSUPPORTED_CHAIN,
				message: 'Chain ID 0 is not supported',
				supportedChains: [
					{ chainId: 1, name: 'Ethereum' },
					{ chainId: 137, name: 'Polygon' },
				],
			});
		});
	});

	describe('GET /health', () => {
		beforeEach(() => {
			process.env.ETHEREUM_RPC_URL = 'https://ethereum.publicnode.com';
		});
		afterEach(() => {
			delete process.env.ETHEREUM_RPC_URL;
		});

		it('should return health endpoint structure', async () => {
			const response = await agent(app).get('/health');
			expect(response.body).toHaveProperty('status');
			expect(response.body).toHaveProperty('timestamp');
			expect(response.body).toHaveProperty('service');
			expect(response.body).toHaveProperty('rpcConnectivity');
			expect(response.body).toHaveProperty('cacheSize');
			expect(response.body.service).toBe('liquidity-service');
		});

		it('should use default RPC URL when environment variable is not set', async () => {
			delete process.env.ETHEREUM_RPC_URL;
			await agent(app).get('/health');
			expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(
				'https://ethereum.publicnode.com'
			);
		});

		it('should use custom RPC URL from environment variable', async () => {
			process.env.ETHEREUM_RPC_URL = 'https://custom-rpc.com';
			await agent(app).get('/health');
			expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(
				'https://custom-rpc.com'
			);
		});

		it('should handle empty environment variable', async () => {
			process.env.ETHEREUM_RPC_URL = '';
			await agent(app).get('/health');
			expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(
				'https://ethereum.publicnode.com'
			);
		});
	});
});
