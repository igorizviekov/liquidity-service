import { ethers } from 'ethers';
import { withTimeout } from './timeout';
import { TIMEOUT_CONFIG } from '../constants';
import { SlippageQuote } from '../types';

export interface SlippageCalculationParams {
	router: ethers.Contract;
	path: string[];
	reserveSell: ethers.BigNumber;
	reserveBuy: ethers.BigNumber;
	targetSlippage: number;
	sellTokenDecimals: number;
	buyTokenDecimals: number;
}

export async function calculateSlippageQuote(
	params: SlippageCalculationParams
): Promise<SlippageQuote> {
	const {
		router,
		path,
		reserveSell,
		reserveBuy,
		targetSlippage,
		sellTokenDecimals,
		buyTokenDecimals,
	} = params;

	if (reserveSell.eq(0) || reserveBuy.eq(0)) {
		throw new Error('Reserve amounts are zero - cannot calculate price');
	}

	const PRECISION_BASE = ethers.utils.parseUnits('1', 18);

	const spotPrice = reserveBuy.mul(PRECISION_BASE).div(reserveSell);

	const minTradeAmount = ethers.utils.parseUnits('0.001', sellTokenDecimals);
	const maxTradePercent = targetSlippage >= 0.1 ? 60 : 20;
	const maxTradeAmount = reserveSell.mul(maxTradePercent).div(100);

	let low = minTradeAmount;
	let high = maxTradeAmount;
	let bestResult: SlippageQuote | null = null;
	let bestDiffBP = Number.POSITIVE_INFINITY;
	const targetSlippageBP = Math.floor(targetSlippage * 10000);
	const toleranceBP = 50;

	for (let i = 0; i < 15 && low.lte(high); i++) {
		const mid = low.add(high).div(2);

		if (mid.eq(0) || mid.gte(reserveSell.div(2))) {
			high = mid.sub(1);
			continue;
		}

		try {
			const amountsOut = (await withTimeout(
				router.getAmountsOut(mid, path),
				TIMEOUT_CONFIG.RPC_CALL_TIMEOUT,
				'RPC call timeout'
			)) as ethers.BigNumber[];

			const amountOut = amountsOut[amountsOut.length - 1];

			if (amountOut.eq(0)) {
				high = mid.sub(1);
				continue;
			}

			const effectivePrice = amountOut.mul(PRECISION_BASE).div(mid);
			const priceImpactBP = spotPrice
				.sub(effectivePrice)
				.mul(10_000)
				.div(spotPrice);
			const priceImpactBPNum = priceImpactBP.toNumber();
			const diffBP = Math.abs(priceImpactBPNum - targetSlippageBP);

			if (diffBP <= toleranceBP) {
				bestResult = {
					sellAmount: ethers.utils.formatUnits(mid, sellTokenDecimals),
					buyAmount: ethers.utils.formatUnits(amountOut, buyTokenDecimals),
				};
				break;
			}

			if (diffBP < bestDiffBP) {
				bestDiffBP = diffBP;
				bestResult = {
					sellAmount: ethers.utils.formatUnits(mid, sellTokenDecimals),
					buyAmount: ethers.utils.formatUnits(amountOut, buyTokenDecimals),
				};
			}

			if (priceImpactBPNum < targetSlippageBP) {
				low = mid.add(1);
			} else {
				high = mid.sub(1);
			}
		} catch (error) {
			high = mid.sub(1);
		}
	}

	if (!bestResult) {
		throw new Error(
			`Could not calculate quote for ${targetSlippage * 100}% slippage`
		);
	}

	return bestResult;
}
