export const CLIENT_ERROR_PATTERNS = [
	'Invalid address',
	'No liquidity pool',
	'Unsupported chain',
	'Invalid token addresses',
	'Could not calculate quote',
	'Invalid token contract',
	'Invalid token decimals',
	'zero reserves',
	'not a valid ERC20 token',
] as const;

export const HTTP_STATUS = {
	OK: 200,
	BAD_REQUEST: 400,
	INTERNAL_SERVER_ERROR: 500,
	SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_TYPES = {
	INVALID_REQUEST: 'Invalid request',
	SERVICE_UNAVAILABLE: 'Service unavailable',
	INTERNAL_SERVER_ERROR: 'Internal server error',
	TOO_MANY_REQUESTS: 'Too many requests',
	UNSUPPORTED_CHAIN: 'Unsupported chain',
	INVALID_CHAIN_ID: 'Invalid chainId',
	INVALID_TOKEN_PAIR: 'Invalid token pair',
	MISSING_PARAMETERS: 'Missing or invalid required parameters',
} as const;

export const NETWORK_ERROR_PATTERNS = [
	'RPC call failed',
	'Request timeout',
	'CALL_EXCEPTION',
	'timeout',
	'Cannot connect to',
	'network is slow or unavailable',
] as const;

export const isClientError = (error: Error): boolean => {
	return CLIENT_ERROR_PATTERNS.some((pattern) =>
		error.message.includes(pattern)
	);
};

export const isNetworkError = (error: Error): boolean => {
	return NETWORK_ERROR_PATTERNS.some((pattern) =>
		error.message.includes(pattern)
	);
};
