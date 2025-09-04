import { NextResponse } from "next/server";
import { HttpError, internal } from "./errors";

export const success = <T>(data: T, init?: ResponseInit) =>
  NextResponse.json(data as any, { status: (init?.status ?? 200), ...init });

export const error = (err: unknown) => {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }
  console.error("Unhandled error", err);
  const e = internal();
  return NextResponse.json(
    { error: { code: e.code, message: e.message } },
    { status: e.status }
  );
};

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "BAD_REQUEST", "Invalid JSON body");
  }
}
