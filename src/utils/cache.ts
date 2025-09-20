export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	lastAccessed: number;
}

export class SimpleCache<T> {
	private cache = new Map<string, CacheEntry<T>>();

	constructor(private maxSize: number, private ttl: number) {}

	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (now - entry.timestamp > this.ttl) {
			this.cache.delete(key);
			return null;
		}

		entry.lastAccessed = now;

		return entry.data;
	}

	set(key: string, data: T): void {
		const now = Date.now();
		if (this.cache.has(key)) {
			this.cache.set(key, {
				data,
				timestamp: now,
				lastAccessed: now,
			});
			return;
		}

		if (this.cache.size >= this.maxSize) {
			this.makeRoom();
		}

		this.cache.set(key, {
			data,
			timestamp: now,
			lastAccessed: now,
		});
	}

	size(): number {
		return this.cache.size;
	}

	clear(): void {
		this.cache.clear();
	}

	private makeRoom(): void {
		const now = Date.now();

		let removedExpired = 0;
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > this.ttl) {
				this.cache.delete(key);
				removedExpired++;
			}
		}

		if (this.cache.size >= this.maxSize) {
			const entries = Array.from(this.cache.entries());

			entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

			const toRemove = Math.max(1, Math.floor(this.maxSize * 0.25));

			for (let i = 0; i < toRemove && i < entries.length; i++) {
				this.cache.delete(entries[i][0]);
			}
		}
	}

	getStats(): {
		size: number;
		maxSize: number;
		oldestEntry: number | null;
		newestEntry: number | null;
	} {
		const now = Date.now();
		let oldest: number | null = null;
		let newest: number | null = null;

		for (const entry of this.cache.values()) {
			if (oldest === null || entry.timestamp < oldest) {
				oldest = entry.timestamp;
			}
			if (newest === null || entry.timestamp > newest) {
				newest = entry.timestamp;
			}
		}

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			oldestEntry: oldest ? now - oldest : null,
			newestEntry: newest ? now - newest : null,
		};
	}
}
