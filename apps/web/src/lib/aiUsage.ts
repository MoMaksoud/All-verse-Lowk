const DEFAULT_DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_AI_DAILY_TOKENS || 5000);

// In-memory usage map (day+user -> tokens). Simple and fast; resets on redeploy.
const USAGE = new Map<string, { tokensUsed: number; requests: number }>();

function key(userId: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `${userId}_${day}`;
}

export async function assertTokenBudget(userId: string, precharge: number, dailyLimit = DEFAULT_DAILY_LIMIT) {
  const k = key(userId);
  const cur = USAGE.get(k) ?? { tokensUsed: 0, requests: 0 };
  if (cur.tokensUsed + precharge > dailyLimit) throw new Error('TOKEN_LIMIT_EXCEEDED');
  USAGE.set(k, { tokensUsed: cur.tokensUsed + precharge, requests: cur.requests + 1 });
}

export async function addUsage(userId: string, actualTotalTokens: number, precharged: number) {
  const k = key(userId);
  const cur = USAGE.get(k);
  if (!cur) return;
  const delta = Math.max(0, actualTotalTokens - precharged);
  if (delta === 0) return;
  USAGE.set(k, { tokensUsed: cur.tokensUsed + delta, requests: cur.requests });
}


