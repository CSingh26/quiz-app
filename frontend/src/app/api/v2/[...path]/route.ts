import { proxyPlatformRequest } from "../../../../lib/platform-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handler(request: Request) {
  return proxyPlatformRequest(request);
}

export {
  handler as GET,
  handler as HEAD,
  handler as OPTIONS,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
