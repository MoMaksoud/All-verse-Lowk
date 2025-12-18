import { ErrorCode } from "@marketplace/types";

export class HttpError extends Error {
  status: number;
  code: ErrorCode;
  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string) => new HttpError(400, "BAD_REQUEST", msg);
export const notFound = (msg: string) => new HttpError(404, "NOT_FOUND", msg);
export const unauthorized = (msg: string) => new HttpError(401, "UNAUTHORIZED", msg);
export const rateLimited = (msg: string) => new HttpError(429, "RATE_LIMITED", msg);
export const internal = (msg = "Something went wrong") => new HttpError(500, "INTERNAL", msg);

