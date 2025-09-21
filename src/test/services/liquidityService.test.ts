import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiquidityService } from '../../services/liquidityService';
import { LiquidityRequest } from '../../types';
import { validateAndNormalizeAddresses } from '../../utils/address';
import { getChainConfig } from '../../config/chains';
import { calculateSlippageQuote } from '../../utils/slippage';

vi.mock('../../config/chains', () => ({ getChainConfig: vi.fn() }));

vi.mock('../../utils/address', () => ({
	validateAndNormalizeAddresses: vi.fn(),
}));

vi.mock('../../utils/error', () => ({
	getErrorMessage: vi.fn((error, message) => `${message}: ${error.message}`),
}));

vi.mock('../../utils/slippage', () => ({ calculateSlippageQuote: vi.fn() }));

describe('LiquidityService', () => {
	let liquidityService: LiquidityService;
	const validRequest: LiquidityRequest = {
		sellToken: '0x742d35Cc6634C0532925A3B8D4C9dB96C4B4d8B6',
		buyToken: '0xA0b86a33e6c0c8c4C8C4C8c4c8c4C8C4C8C4C8C4',
		chainId: 1,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		liquidityService = new LiquidityService();
	});

	it('should create LiquidityService instance', () => {
		expect(liquidityService).toBeDefined();
		expect(typeof liquidityService.getLiquidityQuotes).toBe('function');
	});

	it('should throw error for invalid token addresses', async () => {
		vi.mocked(validateAndNormalizeAddresses).mockImplementation(() => {
			throw new Error('Invalid address');
		});
		await expect(
			liquidityService.getLiquidityQuotes(validRequest)
		).rejects.toThrow('Invalid token addresses: Invalid address');
	});

	it('should throw error when sell and buy tokens are the same', async () => {
		vi.mocked(validateAndNormalizeAddresses).mockReturnValue([
			validRequest.sellToken,
			validRequest.sellToken,
		]);
		await expect(
			liquidityService.getLiquidityQuotes(validRequest)
		).rejects.toThrow('Sell and buy tokens cannot be the same');
	});

	it('should throw error for unsupported chain', async () => {
		vi.mocked(validateAndNormalizeAddresses).mockReturnValue([
			validRequest.sellToken,
			validRequest.buyToken,
		]);
		vi.mocked(getChainConfig).mockImplementation(() => {
			throw new Error('Unsupported chain ID: 999');
		});
		await expect(
			liquidityService.getLiquidityQuotes(validRequest)
		).rejects.toThrow('Unsupported chain ID: 999');
	});

	it('should return liquidity quotes when all calculations succeed', async () => {
		vi.mocked(validateAndNormalizeAddresses).mockReturnValue([
			validRequest.sellToken,
			validRequest.buyToken,
		]);
		vi.mocked(getChainConfig).mockReturnValue({
			rpcUrl: 'https://ethereum.publicnode.com',
			factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
			routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
			name: 'Ethereum',
		});
		vi.mocked(calculateSlippageQuote).mockImplementation((params) => {
			const sellAmount = params.reserveSell.toString();
			const buyAmount = params.reserveBuy.toString();
			return Promise.resolve({ sellAmount, buyAmount });
		});
		const mockGetTokenReserves = vi.spyOn(
			liquidityService as any,
			'getTokenReserves'
		);
		const mockGetTokenDecimals = vi.spyOn(
			liquidityService as any,
			'getTokenDecimals'
		);
		mockGetTokenReserves.mockResolvedValue({
			reserveSell: '500000000000000000000',
			reserveBuy: '3000000000000000000000',
			token0: validRequest.sellToken,
			token1: validRequest.buyToken,
		});
		mockGetTokenDecimals.mockResolvedValue(18);
		const result = await liquidityService.getLiquidityQuotes(validRequest);
		expect(result).toEqual({
			sellToken: validRequest.sellToken,
			buyToken: validRequest.buyToken,
			chainId: validRequest.chainId,
			quotes: {
				'1%': {
					sellAmount: '500000000000000000000',
					buyAmount: '3000000000000000000000',
				},
				'5%': {
					sellAmount: '500000000000000000000',
					buyAmount: '3000000000000000000000',
				},
				'10%': {
					sellAmount: '500000000000000000000',
					buyAmount: '3000000000000000000000',
				},
			},
		});
	});

	it('should handle slippage calculation failures', async () => {
		vi.mocked(validateAndNormalizeAddresses).mockReturnValue([
			validRequest.sellToken,
			validRequest.buyToken,
		]);
		vi.mocked(getChainConfig).mockReturnValue({
			rpcUrl: 'https://ethereum.publicnode.com',
			factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
			routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
			name: 'Ethereum',
		});
		vi.mocked(calculateSlippageQuote).mockRejectedValue(
			new Error('Slippage calculation failed')
		);
		const mockGetTokenReserves = vi.spyOn(
			liquidityService as any,
			'getTokenReserves'
		);
		const mockGetTokenDecimals = vi.spyOn(
			liquidityService as any,
			'getTokenDecimals'
		);
		mockGetTokenReserves.mockResolvedValue({
			reserveSell: '1000000000000000000000',
			reserveBuy: '2000000000000000000000',
			token0: validRequest.sellToken,
			token1: validRequest.buyToken,
		});
		mockGetTokenDecimals.mockResolvedValue(18);
		await expect(
			liquidityService.getLiquidityQuotes(validRequest)
		).rejects.toThrow(
			'Failed to calculate slippage quotes. Errors: 1%: Slippage calculation failed, 5%: Slippage calculation failed, 10%: Slippage calculation failed'
		);
	});
});
