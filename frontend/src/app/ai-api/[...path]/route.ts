import { NextRequest, NextResponse } from "next/server";

const target =
  process.env.AI_SERVICE_PROXY_TARGET?.trim() ?? "http://127.0.0.1:8000";
const token =
  process.env.AI_SERVICE_TOKEN?.trim() ??
  process.env.NEXT_PUBLIC_AI_SERVICE_TOKEN?.trim() ??
  "";

async function proxy(
  req: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = pathSegments.join("/");
  const url = `${target.replace(/\/$/, "")}/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("X-Internal-Token", token);

  const init: RequestInit = {
    method: req.method,
    headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(url, init);
  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
