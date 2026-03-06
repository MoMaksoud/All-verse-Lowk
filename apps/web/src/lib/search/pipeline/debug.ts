export function nowMs() {
    return Date.now();
}

export function startTimer() {
    const start = Date.now();
    return () => Date.now() - start;
}

export function debugLog(
    enabled: boolean,
    traceId: string,
    phase: string,
    details?: Record<string, unknown>
) {
    if (!enabled) return;
    if (details) console.info(`[search][${traceId}] ${phase}`, details);
    else console.info(`[search][${traceId}] ${phase}`);
}