import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { LimitError } from "@/domain/plans";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function prismaCode(error: unknown): string | undefined {
  if (typeof error === "object" && error && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
}

export function parseInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
}

export function normalizeError(error: unknown): { status: number; message: string } {
  if (error instanceof HttpError) return { status: error.status, message: error.message };
  if (error instanceof LimitError) return { status: 402, message: error.message };
  const code = prismaCode(error);
  if (code === "P2002") return { status: 409, message: "That value is already in use" };
  if (code === "P2003") return { status: 409, message: "That record is still in use" };
  if (code === "P2025") return { status: 404, message: "That record was not found" };
  console.error(error);
  return { status: 500, message: "Something went wrong" };
}

export function publicOrigin(req: Request): string {
  const configured = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) return `${forwardedProto || "https"}://${forwardedHost}`;
  return new URL(req.url).origin;
}

export function safeLocation(req: Request, path: string): URL {
  if (path.startsWith("/") && !path.startsWith("//")) {
    return new URL(path, publicOrigin(req));
  }
  const url = new URL(path);
  if (url.protocol === "https:" && url.hostname === "checkout.stripe.com") return url;
  throw new HttpError(500, "Refused an unexpected redirect");
}

export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Cross-origin request refused");
  }
  const expected = new URL(publicOrigin(req)).host;
  if (originHost !== expected) throw new HttpError(403, "Cross-origin request refused");
}

export function isForm(req: Request): boolean {
  const contentType = req.headers.get("content-type") ?? "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

export async function readBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      throw new HttpError(400, "Request body must be JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new HttpError(400, "Request body must be a JSON object");
    }
    const body: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        body[key] = String(value);
      }
    }
    return body;
  }
  const form = await req.formData();
  const body: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") body[key] = value;
  }
  return body;
}

export function jsonError(error: unknown): NextResponse {
  const normalized = normalizeError(error);
  return NextResponse.json({ error: normalized.message }, { status: normalized.status });
}
