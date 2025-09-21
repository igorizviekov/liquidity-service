import { describe, it, expect } from 'vitest';
import { validateAndNormalizeAddresses } from '../../utils/address';

describe('validateAndNormalizeAddresses', () => {
	it('should normalize a single valid address', () => {
		const address = '0x742D35cC6634c0532925a3b8d4c9db96c4b4d8B6';
		const result = validateAndNormalizeAddresses(address);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('0x742d35Cc6634C0532925A3B8D4C9dB96C4B4d8B6');
	});

	it('should normalize multiple valid addresses', () => {
		const addresses = [
			'0x742d35CC6634C0532925A3B8D4C9dB96C4B4d8B6',
			'0xa0B86a33e6c0c8c4c8c4c8c4c8c4c8c4c8c4c8c4',
			'0x1234567890123456789012345678901234567890',
		];
		const result = validateAndNormalizeAddresses(...addresses);

		expect(result).toHaveLength(3);
		expect(result[0]).toBe('0x742d35Cc6634C0532925A3B8D4C9dB96C4B4d8B6');
		expect(result[1]).toBe('0xA0b86a33e6c0c8c4C8C4C8c4c8c4C8C4C8C4C8C4');
		expect(result[2]).toBe('0x1234567890123456789012345678901234567890');
	});

	it('should handle already checksummed addresses', () => {
		const address = '0x742d35Cc6634C0532925A3B8D4C9dB96C4B4d8B6';
		const result = validateAndNormalizeAddresses(address);

		expect(result).toHaveLength(1);
		expect(result[0]).toBe('0x742d35Cc6634C0532925A3B8D4C9dB96C4B4d8B6');
	});

	it('should throw error for empty string', () => {
		expect(() => {
			validateAndNormalizeAddresses('');
		}).toThrow('Invalid address at position 0: ');
	});

	it('should throw error for invalid hex string', () => {
		expect(() => {
			validateAndNormalizeAddresses('0xfoo');
		}).toThrow('Invalid address at position 0: 0xfoo');
	});

	it('should throw error for address too short', () => {
		expect(() => {
			validateAndNormalizeAddresses('0x742d35cc6634c0532925a3b8d4c9db96c4b4d8');
		}).toThrow(
			'Invalid address at position 0: 0x742d35cc6634c0532925a3b8d4c9db96c4b4d8'
		);
	});

	it('should throw error for address too long', () => {
		expect(() => {
			validateAndNormalizeAddresses(
				'0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6a'
			);
		}).toThrow(
			'Invalid address at position 0: 0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6a'
		);
	});

	it('should throw error for null input', () => {
		expect(() => {
			validateAndNormalizeAddresses(null as any);
		}).toThrow();
	});

	it('should throw error for undefined input', () => {
		expect(() => {
			validateAndNormalizeAddresses(undefined as any);
		}).toThrow();
	});

	it('should throw error for non-string input', () => {
		expect(() => {
			validateAndNormalizeAddresses(123 as any);
		}).toThrow();
	});

	it('should throw error for invalid address with mixed validity', () => {
		const addresses = [
			'0xfoo',
			'0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
			'0xa0b86a33e6c0c8c4c8c4c8c4c8c4c8c4c8c4c8c4',
		];

		expect(() => {
			validateAndNormalizeAddresses(...addresses);
		}).toThrow('Invalid address at position 0: 0xfoo');
	});

	it('should handle empty array', () => {
		const result = validateAndNormalizeAddresses();
		expect(result).toHaveLength(0);
	});

	it('should handle string with spaces', () => {
		expect(() => {
			validateAndNormalizeAddresses(
				' 0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6 '
			);
		}).toThrow(
			'Invalid address at position 0:  0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6 '
		);
	});
});
