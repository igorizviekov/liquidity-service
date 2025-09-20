export interface LiquidityRequest {
	sellToken: string;
	buyToken: string;
	chainId: number;
}

export interface SlippageQuote {
	sellAmount: string;
	buyAmount: string;
}

export interface LiquidityResponse {
	sellToken: string;
	buyToken: string;
	chainId: number;
	quotes: {
		'1%': SlippageQuote;
		'5%': SlippageQuote;
		'10%': SlippageQuote;
	};
}

export interface ChainConfig {
	rpcUrl: string;
	factoryAddress: string;
	routerAddress: string;
	name: string;
}

export interface TokenReserves {
	reserveSell: string;
	reserveBuy: string;
	token0: string;
	token1: string;
}
