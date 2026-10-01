export function readCookie(request: Request, name: string): string | undefined {
  const matches = (request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${name}=`));
  if (matches.length !== 1) return undefined;
  try {
    return decodeURIComponent(matches[0].slice(name.length + 1));
  } catch {
    return undefined;
  }
}
export function cookieHeader(
  name: string,
  value: string,
  options: { expires: Date; secure: boolean },
) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw new Error("Invalid cookie name");
  return `${name}=${encodeURIComponent(value)}; Path=/; Expires=${options.expires.toUTCString()}; HttpOnly; SameSite=Lax${options.secure ? "; Secure" : ""}`;
}
