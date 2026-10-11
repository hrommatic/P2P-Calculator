import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb, saveDatabase } from "../utils/db/index.js";
import type { User } from "../schemas/auth.schema.js";
import { getBearerToken } from "./helpers.js";

export async function authenticate(
  req: VercelRequest,
  res: VercelResponse,
): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) {
    res
      .status(401)
      .json({ error: "Потрібна авторизація (Authorization required)" });
    return null;
  }

  const db = await getDb();
  const session = db.sessions.find((s) => s.token === token);

  if (!session) {
    res.status(401).json({ error: "Недійсний токен сесії (Invalid session)" });
    return null;
  }

  const expires = new Date(session.expiresAt).getTime();
  if (expires < Date.now()) {
    db.sessions = db.sessions.filter((s) => s.token !== token);
    await saveDatabase(db);
    res.status(401).json({ error: "Сесія закінчилася (Session expired)" });
    return null;
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: "Користувача не знайдено (User not found)" });
    return null;
  }

  if (user.status === "blocked") {
    res
      .status(403)
      .json({
        error:
          "Ваш акаунт заблоковано. Зверніться до куратора (Account is blocked)",
      });
    return null;
  }

  return user;
}

export function requireAdmin(
  user: User | null,
  res: VercelResponse,
): user is User {
  if (!user || user.role !== "admin") {
    res
      .status(403)
      .json({
        error:
          "Доступ заборонено: потрібні права адміністратора (Admin rights required)",
      });
    return false;
  }
  return true;
}
