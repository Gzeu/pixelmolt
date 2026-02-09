/**
 * Storage Provider Abstraction
 * 
 * Allows swapping between file-based storage (local dev) and 
 * cloud storage (Vercel KV, Redis, PostgreSQL) for production.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StorageProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * File-based storage for local development
 * 
 * ⚠️ WARNING: This will NOT persist on Vercel's ephemeral filesystem!
 * Use only for local dev or accept that data resets on each deploy.
 */
export class FileStorage implements StorageProvider {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || process.cwd();
  }

  private getFilePath(key: string): string {
    // Sanitize key to be a valid filename
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.basePath, `${safeKey}.json`);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const filePath = this.getFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    return fs.existsSync(filePath);
  }
}

/**
 * In-Memory storage for serverless environments
 * 
 * Data persists within a single function invocation but resets
 * between cold starts. Useful for caching within requests.
 */
export class MemoryStorage implements StorageProvider {
  private store: Map<string, unknown> = new Map();

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = this.store.get(key);
    return (value as T) ?? null;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

/**
 * Future: Redis/Vercel KV Storage
 * 
 * Uncomment and configure when ready for production persistence.
 * 
 * Required env vars:
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 */
// export class KVStorage implements StorageProvider {
//   async get<T = unknown>(key: string): Promise<T | null> {
//     // const { kv } = await import('@vercel/kv');
//     // return await kv.get(key);
//   }
//   async set<T = unknown>(key: string, value: T): Promise<void> {
//     // const { kv } = await import('@vercel/kv');
//     // await kv.set(key, value);
//   }
//   async delete(key: string): Promise<void> {
//     // const { kv } = await import('@vercel/kv');
//     // await kv.del(key);
//   }
//   async exists(key: string): Promise<boolean> {
//     // const { kv } = await import('@vercel/kv');
//     // return (await kv.exists(key)) > 0;
//   }
// }

// Default export - use FileStorage for now
// Switch to KVStorage for production Vercel deployment
let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new FileStorage();
  }
  return storageInstance;
}

export function setStorage(provider: StorageProvider): void {
  storageInstance = provider;
}
