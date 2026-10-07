import "server-only";

import type { NextRequest } from "next/server";

export type ServerSession = {
  authenticated: boolean;
  userId?: string;
  mode: "demo" | "real";
};

/**
 * Adapter boundary for the production authentication provider.
 * Replace the cookie lookup with the site's session verification (for example,
 * a signed cookie or a call to the existing identity provider). It deliberately
 * runs only on the server and never exposes credentials to a Client Component.
 */
export async function getServerSession(request: NextRequest): Promise<ServerSession> {
  if (process.env.AUTH_MODE !== "real") return { authenticated: false, mode: "demo" };

  const sessionId = request.cookies.get(process.env.BUHEXPERT_SESSION_COOKIE || "buhexpert_session")?.value;
  if (!sessionId) return { authenticated: false, mode: "real" };

  // TODO(auth): verify `sessionId` with the production provider and return its stable user id.
  // A cookie existing on its own is never proof of authentication.
  return { authenticated: false, mode: "real" };
}
