export const CACHE_CONFIG = {
	TTL: 30000,
	MAX_SIZE: 1000,
} as const;

export const RATE_LIMIT_CONFIG = {
	WINDOW_MS: 15 * 60 * 1000,
	MAX_REQUESTS: 100,
} as const;

export const TIMEOUT_CONFIG = {
	RPC_CALL_TIMEOUT: 10000,
	HEALTH_CHECK_TIMEOUT: 5000,
} as const;

export const VALIDATION_LIMITS = {
	MIN_TOKEN_DECIMALS: 0,
	MAX_TOKEN_DECIMALS: 77,
} as const;

export * from './errors';
