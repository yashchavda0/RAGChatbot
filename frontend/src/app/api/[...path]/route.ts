import { NextRequest } from "next/server";

const UPSTREAM_API_BASE =
  process.env.INTERNAL_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function buildUpstreamUrl(pathSegments: string[], requestUrl: string): string {
  const incomingUrl = new URL(requestUrl);
  const upstream = new URL(UPSTREAM_API_BASE.replace(/\/$/, ""));
  upstream.pathname = `${upstream.pathname.replace(/\/$/, "")}/${pathSegments.join("/")}`;
  upstream.search = incomingUrl.search;
  return upstream.toString();
}

function copyForwardHeaders(req: NextRequest): Headers {
  const headers = new Headers();

  req.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized)) {
      return;
    }
    headers.set(key, value);
  });

  headers.set("x-forwarded-host", req.headers.get("host") || "");
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""));
  headers.set(
    "x-forwarded-for",
    req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
  );

  return headers;
}

function copyResponseHeaders(headers: Headers): Headers {
  const result = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      result.set(key, value);
    }
  });
  return result;
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  const upstreamUrl = buildUpstreamUrl(pathSegments, req.url);
  const method = req.method;

  const hasBody = method !== "GET" && method !== "HEAD";

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: copyForwardHeaders(req),
      body: hasBody ? req.body : undefined,
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
      cache: "no-store",
    } as RequestInit & { duplex?: "half" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[proxy] Failed to reach upstream ${upstreamUrl}:`, message);
    return new Response(
      JSON.stringify({
        detail: "Backend service is unreachable. Please try again later.",
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: copyResponseHeaders(upstreamResponse.headers),
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}

export async function OPTIONS(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyRequest(req, path);
}
