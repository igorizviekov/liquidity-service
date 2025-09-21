import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleCache } from '../../utils/cache';

let cache: SimpleCache<string>;
const maxSize = 3;
const ttl = 1000;

beforeEach(() => {
	cache = new SimpleCache<string>(maxSize, ttl);
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('SimpleCache constructor', () => {
	it('should create cache with correct maxSize and ttl', () => {
		const newCache = new SimpleCache<number>(5, 2000);
		expect(newCache.size()).toBe(0);
	});

	it('should store and retrieve data', () => {
		cache.set('key1', 'value1');
		expect(cache.get('key1')).toBe('value1');
	});

	it('should return null for non-existent key', () => {
		expect(cache.get('foo')).toBeNull();
	});

	it('should update existing key', () => {
		cache.set('key1', 'value1');
		cache.set('key1', 'value2');
		expect(cache.get('key1')).toBe('value2');
	});

	it('should handle different data types', () => {
		const numberCache = new SimpleCache<number>(maxSize, ttl);
		const objectCache = new SimpleCache<{ id: number; name: string }>(
			maxSize,
			ttl
		);
		numberCache.set('num', 42);
		expect(numberCache.get('num')).toBe(42);
		objectCache.set('obj', { id: 1, name: 'test' });
		expect(objectCache.get('obj')).toEqual({ id: 1, name: 'test' });
	});

	it('should return data before TTL expires', () => {
		cache.set('key1', 'value1');
		vi.advanceTimersByTime(500);
		expect(cache.get('key1')).toBe('value1');
	});

	it('should return null after TTL expires', () => {
		cache.set('key1', 'value1');
		vi.advanceTimersByTime(ttl + 100);
		expect(cache.get('key1')).toBeNull();
	});

	it('should update lastAccessed on get', () => {
		cache.set('key1', 'value1');
		vi.advanceTimersByTime(500);
		cache.get('key1');
		vi.advanceTimersByTime(500);
		expect(cache.get('key1')).toBe('value1');
	});

	it('should remove expired entries when making room', () => {
		cache.set('key1', 'value1');
		vi.advanceTimersByTime(ttl + 100);
		cache.set('key2', 'value2');
		cache.set('key3', 'value3');
		cache.set('key4', 'value4');
		expect(cache.get('key1')).toBeNull();
		expect(cache.get('key2')).toBe('value2');
		expect(cache.get('key3')).toBe('value3');
		expect(cache.get('key4')).toBe('value4');
	});

	it('should return correct size', () => {
		expect(cache.size()).toBe(0);
		cache.set('key1', 'value1');
		expect(cache.size()).toBe(1);
		cache.set('key2', 'value2');
		expect(cache.size()).toBe(2);
	});

	it('should not count expired entries in size', () => {
		cache.set('key1', 'value1');
		vi.advanceTimersByTime(ttl + 100);
		expect(cache.size()).toBe(1);
		cache.get('key1');
		expect(cache.size()).toBe(0);
	});

	it('should clear all entries', () => {
		cache.set('key1', 'value1');
		cache.set('key2', 'value2');
		expect(cache.size()).toBe(2);
		cache.clear();
		expect(cache.size()).toBe(0);
		expect(cache.get('key1')).toBeNull();
		expect(cache.get('key2')).toBeNull();
	});

	it('should work on empty cache', () => {
		expect(() => cache.clear()).not.toThrow();
		expect(cache.size()).toBe(0);
	});

	it('should return correct stats for empty cache', () => {
		const stats = cache.getStats();
		expect(stats.size).toBe(0);
		expect(stats.maxSize).toBe(maxSize);
		expect(stats.oldestEntry).toBeNull();
		expect(stats.newestEntry).toBeNull();
	});

	it('should return correct stats for single entry', () => {
		cache.set('key1', 'value1');
		const stats = cache.getStats();
		expect(stats.size).toBe(1);
		expect(stats.maxSize).toBe(maxSize);
		expect(stats.oldestEntry).toBe(0);
		expect(stats.newestEntry).toBe(0);
	});

	it('should return correct stats for multiple entries', () => {
		cache.set('key1', 'value1');
		vi.advanceTimersByTime(100);
		cache.set('key2', 'value2');
		vi.advanceTimersByTime(100);
		cache.set('key3', 'value3');
		const stats = cache.getStats();
		expect(stats.size).toBe(3);
		expect(stats.maxSize).toBe(maxSize);
		expect(stats.oldestEntry).toBe(200);
		expect(stats.newestEntry).toBe(0);
	});

	it('should handle stats with expired entries', () => {
		cache.set('key1', 'value1');
		vi.advanceTimersByTime(ttl + 100);
		cache.set('key2', 'value2');
		const stats = cache.getStats();
		expect(stats.size).toBe(2);
		expect(stats.oldestEntry).toBe(ttl + 100);
		expect(stats.newestEntry).toBe(0);
	});

	it('should handle empty string keys', () => {
		cache.set('', 'empty_key_value');
		expect(cache.get('')).toBe('empty_key_value');
	});

	it('should handle very small TTL', () => {
		const fastCache = new SimpleCache<string>(maxSize, 1);
		fastCache.set('key1', 'value1');
		expect(fastCache.get('key1')).toBe('value1');
		vi.advanceTimersByTime(2);
		expect(fastCache.get('key1')).toBeNull();
	});

	it('should handle zero maxSize', () => {
		const zeroCache = new SimpleCache<string>(0, ttl);
		zeroCache.set('key1', 'value1');
		expect(zeroCache.get('key1')).toBe('value1');
		expect(zeroCache.size()).toBe(1);
	});

	it('should handle very large maxSize', () => {
		const largeCache = new SimpleCache<string>(1000, ttl);
		for (let i = 0; i < 100; i++) {
			largeCache.set(`key${i}`, `value${i}`);
		}
		expect(largeCache.size()).toBe(100);
		expect(largeCache.get('key50')).toBe('value50');
	});
});
