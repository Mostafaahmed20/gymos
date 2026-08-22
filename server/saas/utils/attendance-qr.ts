import crypto from "crypto";
import QRCode from "qrcode";
import { SAAS_CONFIG } from "../config";

const QR_PREFIX = "gymos-checkin:";
const QR_VERSION = "GMO-QR-1";

export type AttendanceQrPayload = {
  version: typeof QR_VERSION;
  gymId: string;
  gymSlug: string;
  memberId: string;
  memberCode: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function signingSecret() {
  return SAAS_CONFIG.qrCheckinSecret;
}

function sign(encodedPayload: string) {
  return crypto.createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

function timingSafeSignatureMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createAttendanceQrToken(input: {
  gymId: string;
  gymSlug: string;
  memberId: string;
  memberCode: string;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SAAS_CONFIG.qrCheckinTokenMinutes * 60;
  const payload: AttendanceQrPayload = {
    version: QR_VERSION,
    gymId: input.gymId,
    gymSlug: input.gymSlug,
    memberId: input.memberId,
    memberCode: input.memberCode,
    issuedAt,
    expiresAt,
    nonce: crypto.randomUUID(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${QR_PREFIX}${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: new Date(expiresAt * 1000),
  };
}

export function verifyAttendanceQrToken(rawValue: string): AttendanceQrPayload {
  const value = rawValue.trim();
  if (!value.startsWith(QR_PREFIX)) {
    throw new Error("This is not a GymOS attendance QR code.");
  }

  const [encodedPayload, signature, ...extra] = value.slice(QR_PREFIX.length).split(".");
  if (!encodedPayload || !signature || extra.length > 0 || !timingSafeSignatureMatch(signature, sign(encodedPayload))) {
    throw new Error("The attendance QR code is invalid.");
  }

  let payload: AttendanceQrPayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AttendanceQrPayload;
  } catch {
    throw new Error("The attendance QR code cannot be read.");
  }

  if (
    payload.version !== QR_VERSION ||
    !payload.gymId ||
    !payload.gymSlug ||
    !payload.memberId ||
    !payload.memberCode ||
    !Number.isFinite(payload.expiresAt)
  ) {
    throw new Error("The attendance QR code is incomplete.");
  }

  if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error("This attendance QR code has expired. Ask the member to refresh it.");
  }

  return payload;
}

export async function createAttendanceQrImage(token: string) {
  return QRCode.toDataURL(token, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

export const attendanceQrPrefix = QR_PREFIX;
