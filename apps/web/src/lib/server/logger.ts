type LogFields = Record<string, unknown>;

function line(level: 'info' | 'warn' | 'error', msg: string, fields?: LogFields): string {
  return JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...fields,
  });
}

export const serverLogger = {
  info(msg: string, fields?: LogFields): void {
    console.log(line('info', msg, fields));
  },
  warn(msg: string, fields?: LogFields): void {
    console.warn(line('warn', msg, fields));
  },
  error(msg: string, fields?: LogFields): void {
    console.error(line('error', msg, fields));
  },
};
