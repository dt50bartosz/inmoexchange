// lib/server/passwords.ts
// Password hashing (argon2id) and temporary passwords for new logins.
import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export const hashPassword = (password: string) => hash(password);

/** False for a wrong password or a broken hash; never throws. */
export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Token for an emailed link: the raw token goes in the link, only its hash is stored. */
export function linkToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashLinkToken(token) };
}
export const hashLinkToken = (token: string) => createHash("sha256").update(token).digest("hex");

// No look-alike characters (0/O, 1/l/I), so it can be typed from an email
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** e.g. "h7Kq-Wm3x-Pz9e": 12 random characters (~70 bits), in groups of 4. */
export function temporaryPassword() {
  const chars = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return chars.match(/.{4}/g)!.join("-");
}
