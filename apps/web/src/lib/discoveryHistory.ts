export type DiscoverySignal = {
  query: string;
  category?: string;
  source?: string;
  clickedAt: number;
};

const STORAGE_KEY = 'allverse.discovery-history.v1';
const MAX_SIGNALS = 40;

export function readDiscoveryHistory(): DiscoverySignal[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DiscoverySignal =>
        item && typeof item.query === 'string' && typeof item.clickedAt === 'number'
    );
  } catch {
    return [];
  }
}

export function recordDiscoveryClick(signal: Omit<DiscoverySignal, 'clickedAt'>) {
  if (typeof window === 'undefined' || !signal.query.trim()) return;
  const normalized = signal.query.trim().replace(/\s+/g, ' ').slice(0, 120);
  const history = readDiscoveryHistory().filter(
    (item) => item.query.toLowerCase() !== normalized.toLowerCase()
  );
  history.unshift({ ...signal, query: normalized, clickedAt: Date.now() });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_SIGNALS)));
}
