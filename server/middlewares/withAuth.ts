import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { User } from "../schemas/auth.schema.js";
import { authenticate, requireAdmin } from "./auth.js";
import { sendServerError } from "./helpers.js";

type AuthedHandler = (
  req: VercelRequest,
  res: VercelResponse,
  user: User,
) => Promise<void | VercelResponse>;

type PublicHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => Promise<void | VercelResponse>;

export function withPublic(fn: PublicHandler) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    try {
      return await fn(req, res);
    } catch (err) {
      return sendServerError(res, err);
    }
  };
}

export function withAuth(fn: AuthedHandler) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      return await fn(req, res, user);
    } catch (err) {
      return sendServerError(res, err);
    }
  };
}

export function withAdmin(fn: AuthedHandler) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    try {
      const user = await authenticate(req, res);
      if (!user) return;
      if (!requireAdmin(user, res)) return;
      return await fn(req, res, user);
    } catch (err) {
      return sendServerError(res, err);
    }
  };
}
