import { NextResponse } from "next/server";
import type { CookieWrite } from "@/server/cookies";
import {
  assertSameOrigin,
  isForm,
  jsonError,
  normalizeError,
  readBody,
  safeLocation,
} from "@/server/http";

export type ApiResult = {
  redirect?: string;
  json?: unknown;
  status?: number;
  cookies?: CookieWrite[];
};

function applyCookies(response: NextResponse, result: ApiResult | void) {
  for (const cookie of result?.cookies ?? []) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
}

export async function api(
  req: Request,
  errorRedirect: string,
  fn: (body: Record<string, string>) => Promise<ApiResult>,
) {
  try {
    assertSameOrigin(req);
    const body = await readBody(req);
    const result = await fn(body);
    if (isForm(req)) {
      const response = NextResponse.redirect(safeLocation(req, result.redirect ?? errorRedirect), 303);
      applyCookies(response, result);
      return response;
    }
    const response = NextResponse.json(result.json ?? { ok: true }, { status: result.status ?? 200 });
    applyCookies(response, result);
    return response;
  } catch (error) {
    const normalized = normalizeError(error);
    if (isForm(req)) {
      const target = normalized.status === 401 ? "/login" : errorRedirect;
      const url = safeLocation(req, target);
      url.searchParams.set("error", normalized.message);
      return NextResponse.redirect(url, 303);
    }
    return jsonError(error);
  }
}

export async function jsonRoute(fn: () => Promise<unknown>) {
  try {
    return NextResponse.json(await fn());
  } catch (error) {
    return jsonError(error);
  }
}
