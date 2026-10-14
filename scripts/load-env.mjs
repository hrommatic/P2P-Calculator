import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

export function requireTestCredentials() {
  const login = process.env.TEST_LOGIN?.trim();
  const password = process.env.TEST_PASSWORD;
  if (!login || !password) {
    console.error(
      'Missing TEST_LOGIN or TEST_PASSWORD. Add them to .env (see .env.example).',
    );
    process.exit(1);
  }
  return { login, password };
}
