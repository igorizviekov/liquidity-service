import { ethers } from 'ethers';
import { getChainConfig } from '../config/chains';
import {
	LiquidityRequest,
	LiquidityResponse,
	TokenReserves,
	ChainConfig,
} from '../types';
import {
	UNISWAP_V2_FACTORY_ABI,
	UNISWAP_V2_PAIR_ABI,
	UNISWAP_V2_ROUTER_ABI,
	ERC20_ABI,
} from '../abis';
import { validateAndNormalizeAddresses } from '../utils/address';
import { getErrorMessage } from '../utils/error';
import { calculateSlippageQuote } from '../utils/slippage';
import { VALIDATION_LIMITS } from '../constants';

export class LiquidityService {
	private getProvider(chainId: number): ethers.providers.JsonRpcProvider {
		const config = getChainConfig(chainId);
		return new ethers.providers.JsonRpcProvider(config.rpcUrl);
	}

	async getLiquidityQuotes(
		request: LiquidityRequest
	): Promise<LiquidityResponse> {
		const { sellToken, buyToken, chainId } = request;

		let normalizedSellToken: string;
		let normalizedBuyToken: string;

		try {
			[normalizedSellToken, normalizedBuyToken] = validateAndNormalizeAddresses(
				sellToken,
				buyToken
			);
		} catch (error) {
			throw new Error(getErrorMessage(error, 'Invalid token addresses'));
		}

		if (normalizedSellToken === normalizedBuyToken) {
			throw new Error('Sell and buy tokens cannot be the same');
		}

		const config = getChainConfig(chainId);
		const provider = this.getProvider(chainId);

		const reserves = await this.getTokenReserves(
			normalizedSellToken,
			normalizedBuyToken,
			config,
			provider
		);

		const [sellTokenDecimals, buyTokenDecimals] = await Promise.all([
			this.getTokenDecimals(normalizedSellToken, provider),
			this.getTokenDecimals(normalizedBuyToken, provider),
		]);

		const slippageLevels = [0.01, 0.05, 0.1] as const;

		const router = new ethers.Contract(
			config.routerAddress,
			UNISWAP_V2_ROUTER_ABI,
			provider
		);

		const reserveSell = ethers.BigNumber.from(reserves.reserveSell);
		const reserveBuy = ethers.BigNumber.from(reserves.reserveBuy);

		const quotes = await Promise.allSettled(
			slippageLevels.map((slippage) =>
				calculateSlippageQuote({
					router,
					path: [normalizedSellToken, normalizedBuyToken],
					reserveSell,
					reserveBuy,
					targetSlippage: slippage,
					sellTokenDecimals,
					buyTokenDecimals,
				})
			)
		);

		const quote1 = quotes[0].status === 'fulfilled' ? quotes[0].value : null;
		const quote5 = quotes[1].status === 'fulfilled' ? quotes[1].value : null;
		const quote10 = quotes[2].status === 'fulfilled' ? quotes[2].value : null;

		const errors = quotes
			.map((quote, index) =>
				quote.status === 'rejected'
					? `${slippageLevels[index] * 100}%: ${
							quote.reason?.message || 'Unknown error'
					  }`
					: null
			)
			.filter(Boolean);

		if (quote1 === null || quote5 === null || quote10 === null) {
			const errorMessage =
				errors.length > 0
					? `Failed to calculate slippage quotes. Errors: ${errors.join(', ')}`
					: 'Failed to calculate slippage quotes';
			throw new Error(errorMessage);
		}
		return {
			sellToken: normalizedSellToken,
			buyToken: normalizedBuyToken,
			chainId,
			quotes: {
				'1%': quote1,
				'5%': quote5,
				'10%': quote10,
			},
		};
	}

	private async getTokenReserves(
		sellToken: string,
		buyToken: string,
		config: ChainConfig,
		provider: ethers.providers.JsonRpcProvider
	): Promise<TokenReserves> {
		try {
			const factory = new ethers.Contract(
				config.factoryAddress,
				UNISWAP_V2_FACTORY_ABI,
				provider
			);

			const pairAddress = await factory.getPair(sellToken, buyToken);
			if (pairAddress === ethers.constants.AddressZero) {
				throw new Error(
					`No liquidity pool found for pair ${sellToken}/${buyToken} on chain ${config.name}`
				);
			}

			const pair = new ethers.Contract(
				pairAddress,
				UNISWAP_V2_PAIR_ABI,
				provider
			);

			const [reserves, token0, token1] = await Promise.all([
				pair.getReserves(),
				pair.token0(),
				pair.token1(),
			]);

			const [reserve0, reserve1] = reserves;

			if (reserve0.eq(0) || reserve1.eq(0)) {
				throw new Error(
					`Liquidity pool for pair ${sellToken}/${buyToken} has zero reserves`
				);
			}

			const [token0Decimals, token1Decimals] = await Promise.all([
				this.getTokenDecimals(token0, provider),
				this.getTokenDecimals(token1, provider),
			]);

			const MIN_RESERVE_RATIO = 0.0001;
			const ABSOLUTE_MIN_RESERVE_0 = ethers.utils.parseUnits(
				'0.001',
				token0Decimals
			);
			const ABSOLUTE_MIN_RESERVE_1 = ethers.utils.parseUnits(
				'0.001',
				token1Decimals
			);

			const SCALED_MIN_0 = ethers.BigNumber.from(10)
				.pow(token0Decimals)
				.div(1000);
			const SCALED_MIN_1 = ethers.BigNumber.from(10)
				.pow(token1Decimals)
				.div(1000);
			const MIN_RESERVE_0 = ABSOLUTE_MIN_RESERVE_0.gt(SCALED_MIN_0)
				? ABSOLUTE_MIN_RESERVE_0
				: SCALED_MIN_0;
			const MIN_RESERVE_1 = ABSOLUTE_MIN_RESERVE_1.gt(SCALED_MIN_1)
				? ABSOLUTE_MIN_RESERVE_1
				: SCALED_MIN_1;

			if (reserve0.lt(MIN_RESERVE_0) || reserve1.lt(MIN_RESERVE_1)) {
				throw new Error(
					`Insufficient liquidity for reliable pricing in pair ${sellToken}/${buyToken}. ` +
						`Reserves: ${ethers.utils.formatUnits(
							reserve0,
							token0Decimals
						)} / ${ethers.utils.formatUnits(reserve1, token1Decimals)}`
				);
			}

			const testTradeSize = reserve0.div(1000);
			if (testTradeSize.lt(MIN_RESERVE_0.mul(10))) {
				throw new Error(
					`Pool depth too low for reliable pricing in pair ${sellToken}/${buyToken}`
				);
			}

			const isSellToken0 = sellToken.toLowerCase() === token0.toLowerCase();

			return {
				reserveSell: isSellToken0 ? reserve0.toString() : reserve1.toString(),
				reserveBuy: isSellToken0 ? reserve1.toString() : reserve0.toString(),
				token0,
				token1,
			};
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('CALL_EXCEPTION')) {
					throw new Error(
						`RPC call failed: Cannot connect to ${config.name} network`
					);
				}
				if (error.message.includes('timeout')) {
					throw new Error(
						`Request timeout: ${config.name} network is slow or unavailable`
					);
				}
			}
			throw error;
		}
	}

	private async getTokenDecimals(
		tokenAddress: string,
		provider: ethers.providers.JsonRpcProvider
	): Promise<number> {
		try {
			const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
			const decimals = await token.decimals();

			if (
				decimals < VALIDATION_LIMITS.MIN_TOKEN_DECIMALS ||
				decimals > VALIDATION_LIMITS.MAX_TOKEN_DECIMALS
			) {
				throw new Error(
					`Invalid token decimals: ${decimals} for token ${tokenAddress}`
				);
			}

			return decimals;
		} catch (error) {
			if (error instanceof Error && error.message.includes('CALL_EXCEPTION')) {
				throw new Error(
					`Invalid token contract: ${tokenAddress} is not a valid ERC20 token`
				);
			}
			throw error;
		}
	}
}
