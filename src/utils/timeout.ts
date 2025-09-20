export const withTimeout = <T>(
	promise: Promise<T>,
	timeoutMs: number,
	errorMessage = 'Operation timeout'
): Promise<T> => {
	const timeout = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
	);

	return Promise.race([promise, timeout]);
};
