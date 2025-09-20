export const UNISWAP_V2_FACTORY_ABI = [
	'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

export const UNISWAP_V2_PAIR_ABI = [
	'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
	'function token0() external view returns (address)',
	'function token1() external view returns (address)',
];

export const UNISWAP_V2_ROUTER_ABI = [
	'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
];

export const ERC20_ABI = ['function decimals() external view returns (uint8)'];
