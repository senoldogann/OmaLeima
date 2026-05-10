import * as jose from "jsr:@panva/jose@6";

export const qrTokenType = "LEIMA_STAMP_QR";
const qrTokenIssuer = "omaleima.supabase.generate-qr-token";
const qrTokenAudience = "omaleima.supabase.scan-qr";
export const qrTokenTtlSeconds = 45;
export const qrRefreshAfterSeconds = 30;

export type QrTokenPayload = {
  sub: string;
  eventId: string;
  typ: typeof qrTokenType;
  iat: number;
  exp: number;
  jti: string;
  iss: typeof qrTokenIssuer;
  aud: typeof qrTokenAudience;
};

export type VerifiedQrToken =
  | {
      ok: true;
      payload: QrTokenPayload;
    }
  | {
      ok: false;
      status: "INVALID_QR" | "INVALID_QR_TYPE" | "QR_EXPIRED";
      message: string;
    };

const getSecretKey = (secret: string): Uint8Array => new TextEncoder().encode(secret);

const nowUnixSeconds = (): number => Math.floor(Date.now() / 1000);

const isQrTokenPayload = (payload: jose.JWTPayload): payload is QrTokenPayload =>
  typeof payload.sub === "string" &&
  typeof payload.eventId === "string" &&
  payload.typ === qrTokenType &&
  typeof payload.iat === "number" &&
  typeof payload.exp === "number" &&
  typeof payload.jti === "string" &&
  payload.iss === qrTokenIssuer &&
  payload.aud === qrTokenAudience;

export const signQrToken = async (
  qrSigningSecret: string,
  studentId: string,
  eventId: string,
): Promise<{ token: string; expiresAt: string; jti: string }> => {
  const issuedAt = nowUnixSeconds();
  const expiresAt = issuedAt + qrTokenTtlSeconds;
  const jti = crypto.randomUUID();

  const token = await new jose.SignJWT({
    eventId,
    typ: qrTokenType,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(studentId)
    .setIssuer(qrTokenIssuer)
    .setAudience(qrTokenAudience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setJti(jti)
    .sign(getSecretKey(qrSigningSecret));

  return {
    token,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    jti,
  };
};

export const verifyQrToken = async (
  qrSigningSecret: string,
  token: string,
): Promise<VerifiedQrToken> => {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey(qrSigningSecret), {
      algorithms: ["HS256"],
      audience: qrTokenAudience,
      clockTolerance: 5,
      issuer: qrTokenIssuer,
    });

    if (payload.typ !== qrTokenType) {
      return {
        ok: false,
        status: "INVALID_QR_TYPE",
        message: "QR token type is not supported.",
      };
    }

    if (!isQrTokenPayload(payload)) {
      return {
        ok: false,
        status: "INVALID_QR",
        message: "QR token payload is malformed.",
      };
    }

    return {
      ok: true,
      payload,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      return {
        ok: false,
        status: "QR_EXPIRED",
        message: "QR code expired. Ask the student to refresh the QR.",
      };
    }

    return {
      ok: false,
      status: "INVALID_QR",
      message: "QR code is invalid or has been modified.",
    };
  }
};
