import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';
import {
	calculateSlippageQuote,
	SlippageCalculationParams,
} from '../../utils/slippage';

vi.mock('../../utils/timeout', () => ({
	withTimeout: vi.fn((promise) => promise),
}));

vi.mock('../../constants', () => ({
	TIMEOUT_CONFIG: { RPC_CALL_TIMEOUT: 5000 },
}));

vi.mock('ethers', async () => {
	const actual = await vi.importActual('ethers');
	return {
		...actual,
		Contract: vi.fn().mockImplementation(() => ({ getAmountsOut: vi.fn() })),
	};
});

describe('calculateSlippageQuote', () => {
	let mockRouter: ethers.Contract;

	beforeEach(() => {
		mockRouter = {
			getAmountsOut: vi.fn(),
		} as any;
	});

	it('should calculate slippage quote successfully', async () => {
		const mockAmountsOut = [
			ethers.BigNumber.from('1000000000000000000'),
			ethers.BigNumber.from('2000000000000000000'),
		];
		vi.spyOn(mockRouter, 'getAmountsOut').mockResolvedValue(mockAmountsOut);
		const params: SlippageCalculationParams = {
			router: mockRouter,
			path: ['0xTokenA', '0xTokenB'],
			reserveSell: ethers.BigNumber.from('1000000000000000000000'),
			reserveBuy: ethers.BigNumber.from('2000000000000000000000'),
			targetSlippage: 0.01,
			sellTokenDecimals: 18,
			buyTokenDecimals: 18,
		};
		const result = await calculateSlippageQuote(params);
		expect(result).toHaveProperty('sellAmount');
		expect(result).toHaveProperty('buyAmount');
		expect(typeof result.sellAmount).toBe('string');
		expect(typeof result.buyAmount).toBe('string');
		expect(parseFloat(result.sellAmount)).toBeGreaterThan(0);
		expect(parseFloat(result.buyAmount)).toBeGreaterThan(0);
	});

	it('should throw error when reserveSell is zero', async () => {
		const params: SlippageCalculationParams = {
			router: mockRouter,
			path: ['0xTokenA', '0xTokenB'],
			reserveSell: ethers.BigNumber.from('0'),
			reserveBuy: ethers.BigNumber.from('2000000000000000000000'),
			targetSlippage: 0.01,
			sellTokenDecimals: 18,
			buyTokenDecimals: 18,
		};
		await expect(calculateSlippageQuote(params)).rejects.toThrow(
			'Reserve amounts are zero - cannot calculate price'
		);
	});

	it('should throw error when reserveBuy is zero', async () => {
		const params: SlippageCalculationParams = {
			router: mockRouter,
			path: ['0xTokenA', '0xTokenB'],
			reserveSell: ethers.BigNumber.from('1000000000000000000000'),
			reserveBuy: ethers.BigNumber.from('0'),
			targetSlippage: 0.01,
			sellTokenDecimals: 18,
			buyTokenDecimals: 18,
		};
		await expect(calculateSlippageQuote(params)).rejects.toThrow(
			'Reserve amounts are zero - cannot calculate price'
		);
	});

	it('should handle RPC call failures gracefully', async () => {
		vi.spyOn(mockRouter, 'getAmountsOut').mockRejectedValue(
			new Error('RPC Error')
		);
		const params: SlippageCalculationParams = {
			router: mockRouter,
			path: ['0xTokenA', '0xTokenB'],
			reserveSell: ethers.BigNumber.from('1000000000000000000000'),
			reserveBuy: ethers.BigNumber.from('2000000000000000000000'),
			targetSlippage: 0.01,
			sellTokenDecimals: 18,
			buyTokenDecimals: 18,
		};
		await expect(calculateSlippageQuote(params)).rejects.toThrow(
			'Could not calculate quote for 1% slippage'
		);
	});

	it('should handle zero amount out from router', async () => {
		const mockAmountsOut = [
			ethers.BigNumber.from('1000000000000000000'),
			ethers.BigNumber.from('0'),
		];
		vi.spyOn(mockRouter, 'getAmountsOut').mockResolvedValue(mockAmountsOut);
		const params: SlippageCalculationParams = {
			router: mockRouter,
			path: ['0xTokenA', '0xTokenB'],
			reserveSell: ethers.BigNumber.from('1000000000000000000000'),
			reserveBuy: ethers.BigNumber.from('2000000000000000000000'),
			targetSlippage: 0.01,
			sellTokenDecimals: 18,
			buyTokenDecimals: 18,
		};
		await expect(calculateSlippageQuote(params)).rejects.toThrow(
			'Could not calculate quote for 1% slippage'
		);
	});

	it('should handle very small reserves', async () => {
		const mockAmountsOut = [
			ethers.BigNumber.from('1000'),
			ethers.BigNumber.from('2000'),
		];
		vi.spyOn(mockRouter, 'getAmountsOut').mockResolvedValue(mockAmountsOut);
		const params: SlippageCalculationParams = {
			router: mockRouter,
			path: ['0xTokenA', '0xTokenB'],
			reserveSell: ethers.BigNumber.from('1000000000000000000'),
			reserveBuy: ethers.BigNumber.from('2000000000000000000'),
			targetSlippage: 0.01,
			sellTokenDecimals: 18,
			buyTokenDecimals: 18,
		};
		const result = await calculateSlippageQuote(params);
		expect(result).toHaveProperty('sellAmount');
		expect(result).toHaveProperty('buyAmount');
		expect(parseFloat(result.sellAmount)).toBeGreaterThan(0);
		expect(parseFloat(result.buyAmount)).toBeGreaterThan(0);
	});

	it('should handle very large reserves', async () => {
		const mockAmountsOut = [
			ethers.BigNumber.from('1000000000000000000000000'),
			ethers.BigNumber.from('2000000000000000000000000'),
		];
		vi.spyOn(mockRouter, 'getAmountsOut').mockResolvedValue(mockAmountsOut);
		const params: SlippageCalculationParams = {
			router: mockRouter,
			path: ['0xTokenA', '0xTokenB'],
			reserveSell: ethers.BigNumber.from('1000000000000000000000000000'),
			reserveBuy: ethers.BigNumber.from('2000000000000000000000000000'),
			targetSlippage: 0.01,
			sellTokenDecimals: 18,
			buyTokenDecimals: 18,
		};
		const result = await calculateSlippageQuote(params);
		expect(result).toHaveProperty('sellAmount');
		expect(result).toHaveProperty('buyAmount');
		expect(parseFloat(result.sellAmount)).toBeGreaterThan(0);
		expect(parseFloat(result.buyAmount)).toBeGreaterThan(0);
	});
});
