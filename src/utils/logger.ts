const createTimestampedMessage = (message: string): string => {
	return `[${new Date().toISOString()}] ${message}`;
};

export const logInfo = (message: string): void => {
	console.log(createTimestampedMessage(message));
};

export const logError = (message: string, error?: any): void => {
	console.error(createTimestampedMessage(message), error);
};
