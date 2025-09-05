import { promises as fs } from 'fs';
import path from 'path';
import { SimpleListing } from '@marketplace/types';
import { randomUUID } from 'crypto';

const DATA_PATH = path.join(process.cwd(), 'data', 'listings.json');

async function readAll(): Promise<SimpleListing[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw) as SimpleListing[];
  } catch (e) {
    if ((e as any).code === 'ENOENT') return [];
    throw e;
  }
}

async function writeAll(items: SimpleListing[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2));
}

export const db = {
  async list(q?: string, category?: string, min?: number, max?: number, page = 1, limit = 20) {
    const items = await readAll();
    let filtered = items;
    if (q) {
      const s = q.toLowerCase();
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(s) || i.description.toLowerCase().includes(s)
      );
    }
    if (category) filtered = filtered.filter((i) => i.category === category);
    if (typeof min === 'number') filtered = filtered.filter((i) => i.price >= min);
    if (typeof max === 'number') filtered = filtered.filter((i) => i.price <= max);

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    return { data, total, page, limit };
  },

  async get(id: string) {
    const items = await readAll();
    return items.find((i) => i.id === id) || null;
  },

  async create(input: Omit<SimpleListing, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const item: SimpleListing = { id: randomUUID(), createdAt: now, updatedAt: now, ...input };
    const items = await readAll();
    items.unshift(item);
    await writeAll(items);
    return item;
  },

  async update(id: string, patch: Partial<Omit<SimpleListing, 'id' | 'createdAt'>>) {
    const items = await readAll();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    items[idx] = { ...items[idx], ...patch, updatedAt: now };
    await writeAll(items);
    return items[idx];
  },

  async delete(id: string) {
    const items = await readAll();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length === items.length) return false;
    await writeAll(filtered);
    return true;
  }
};
