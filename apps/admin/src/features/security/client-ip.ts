export const resolveClientIp = (request: Request): string => {
  const cloudflareIp = request.headers.get("cf-connecting-ip");

  if (cloudflareIp !== null && cloudflareIp.trim().length > 0) {
    return cloudflareIp.trim();
  }

  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded !== null) {
    const first = forwarded.split(",")[0]?.trim();

    if (typeof first === "string" && first.length > 0) {
      return first;
    }
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};
