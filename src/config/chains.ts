import { ChainConfig } from '../types';

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
	1: {
		rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://ethereum.publicnode.com',
		factoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
		routerAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
		name: 'Ethereum',
	},
	137: {
		rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
		factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
		routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
		name: 'Polygon',
	},
	56: {
		rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
		factoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
		routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
		name: 'BSC',
	},
	42161: {
		rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
		factoryAddress: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
		routerAddress: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
		name: 'Arbitrum',
	},
};

export const getChainConfig = (chainId: number): ChainConfig => {
	const config = CHAIN_CONFIGS[chainId];
	if (!config) {
		throw new Error(`Unsupported chain ID: ${chainId}`);
	}
	return config;
};
