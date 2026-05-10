import * as jose from "jsr:@panva/jose@6";

export const businessScannerLoginTokenType = "LEIMA_BUSINESS_SCANNER_LOGIN_QR";
const businessScannerLoginTokenIssuer = "omaleima.supabase.generate-business-scanner-login";
const businessScannerLoginTokenAudience = "omaleima.mobile.business-scanner-login";
export const businessScannerLoginTokenTtlSeconds = 90;
export const businessScannerLoginRefreshAfterSeconds = 55;

export type BusinessScannerLoginTokenPayload = {
  sub: string;
  businessId: string;
  typ: typeof businessScannerLoginTokenType;
  iat: number;
  exp: number;
  jti: string;
  iss: typeof businessScannerLoginTokenIssuer;
  aud: typeof businessScannerLoginTokenAudience;
};

export type VerifiedBusinessScannerLoginToken =
  | {
      ok: true;
      payload: BusinessScannerLoginTokenPayload;
    }
  | {
      ok: false;
      status: "INVALID_QR" | "INVALID_QR_TYPE" | "QR_EXPIRED";
      message: string;
    };

const getSecretKey = (secret: string): Uint8Array => new TextEncoder().encode(secret);

const nowUnixSeconds = (): number => Math.floor(Date.now() / 1000);

const isBusinessScannerLoginTokenPayload = (
  payload: jose.JWTPayload,
): payload is BusinessScannerLoginTokenPayload =>
  typeof payload.sub === "string" &&
  typeof payload.businessId === "string" &&
  payload.typ === businessScannerLoginTokenType &&
  typeof payload.iat === "number" &&
  typeof payload.exp === "number" &&
  typeof payload.jti === "string" &&
  payload.iss === businessScannerLoginTokenIssuer &&
  payload.aud === businessScannerLoginTokenAudience;

export const signBusinessScannerLoginToken = async (
  qrSigningSecret: string,
  ownerUserId: string,
  businessId: string,
): Promise<{ token: string; expiresAt: string; jti: string }> => {
  const issuedAt = nowUnixSeconds();
  const expiresAt = issuedAt + businessScannerLoginTokenTtlSeconds;
  const jti = crypto.randomUUID();

  const token = await new jose.SignJWT({
    businessId,
    typ: businessScannerLoginTokenType,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(ownerUserId)
    .setIssuer(businessScannerLoginTokenIssuer)
    .setAudience(businessScannerLoginTokenAudience)
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

export const verifyBusinessScannerLoginToken = async (
  qrSigningSecret: string,
  token: string,
): Promise<VerifiedBusinessScannerLoginToken> => {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey(qrSigningSecret), {
      algorithms: ["HS256"],
      audience: businessScannerLoginTokenAudience,
      clockTolerance: 5,
      issuer: businessScannerLoginTokenIssuer,
    });

    if (payload.typ !== businessScannerLoginTokenType) {
      return {
        ok: false,
        status: "INVALID_QR_TYPE",
        message: "Business scanner QR token type is not supported.",
      };
    }

    if (!isBusinessScannerLoginTokenPayload(payload)) {
      return {
        ok: false,
        status: "INVALID_QR",
        message: "Business scanner QR token payload is malformed.",
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
        message: "Business scanner QR expired. Ask the owner to show a fresh QR.",
      };
    }

    return {
      ok: false,
      status: "INVALID_QR",
      message: "Business scanner QR is invalid or modified.",
    };
  }
};
