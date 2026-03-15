import { NextResponse } from "next/server";
import type { ApiResponse, ApiMeta } from "@/types";

export function ok<T>(data: T, meta?: ApiMeta, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, error: null, ...(meta && { meta }) }, { status });
}

export function created<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, error: null }, { status: 201 });
}

export function badRequest(message: string): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ success: false, data: null, error: message }, { status: 400 });
}

export function unauthorized(): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse<ApiResponse<null>> {
  return NextResponse.json({ success: false, data: null, error: "Forbidden" }, { status: 403 });
}

export function notFound(resource = "Resource"): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, data: null, error: `${resource} not found` },
    { status: 404 }
  );
}

export function tooManyRequests(): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, data: null, error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}

export function serverError(err: unknown): NextResponse<ApiResponse<null>> {
  console.error("[API Error]", err);
  return NextResponse.json({ success: false, data: null, error: "Internal server error" }, { status: 500 });
}
