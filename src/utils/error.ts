export const getErrorMessage = (
	error: unknown,
	fallbackMessage = 'Unknown error'
): string => {
	return error instanceof Error ? error.message : fallbackMessage;
};
