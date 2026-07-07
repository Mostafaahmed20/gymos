import bcrypt from "bcryptjs";
import { SAAS_CONFIG } from "../config";

export async function hashPassword(rawPassword: string) {
  return bcrypt.hash(rawPassword, SAAS_CONFIG.bcryptRounds);
}

export async function verifyPassword(rawPassword: string, hash: string) {
  return bcrypt.compare(rawPassword, hash);
}
