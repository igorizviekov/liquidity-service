import { ethers } from 'ethers';

const toChecksumAddress = (address: string): string | null => {
	try {
		return ethers.utils.getAddress(address.toLowerCase());
	} catch {
		return null;
	}
};

export const validateAndNormalizeAddresses = (
	...addresses: string[]
): string[] => {
	const result: string[] = [];

	for (let i = 0; i < addresses.length; i++) {
		const checksummed = toChecksumAddress(addresses[i]);
		if (!checksummed) {
			throw new Error(`Invalid address at position ${i}: ${addresses[i]}`);
		}
		result.push(checksummed);
	}

	return result;
};
