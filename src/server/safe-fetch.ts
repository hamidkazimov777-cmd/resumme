import { lookup } from "dns/promises";
import net from "net";

// ---------------------------------------------------------------------------
// Guarded outbound fetch for user-supplied URLs.
//
// The job analyzer lets a caller hand the server an arbitrary URL. Without a
// guard that is an SSRF primitive: the server would happily read cloud metadata
// endpoints (169.254.169.254), services bound to localhost, or anything else on
// the private network, and the analyzer would return the content back to the
// caller. Everything here exists to make that impossible.
//
// Rules enforced below:
//   1. Only http: and https: schemes.
//   2. Every hop must resolve to a public unicast address.
//   3. Redirects are followed manually so each new host is re-checked.
//   4. Response body, redirect count and total time are all capped.
//
// Known residual risk: a hostile DNS record can, in theory, answer differently
// between the check and the connection (DNS rebinding). Closing that fully
// means pinning the socket to the address we validated, which the fetch API
// does not expose. The checks below still remove every direct path.
// ---------------------------------------------------------------------------

const MAX_REDIRECTS = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const USER_AGENT = "Mozilla/5.0 (compatible; Resumee/1.0)";

// IPv4 ranges that are never a legitimate job board.
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // this network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, includes 255.255.255.255
];

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => acc * 256 + Number(part), 0) >>> 0;
}

function isBlockedV4(ip: string): boolean {
  const value = v4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (v4ToInt(base) & mask);
  });
}

function isBlockedV6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0];
  if (addr === "::" || addr === "::1") return true;

  // IPv4-mapped (::ffff:127.0.0.1) reaches the IPv4 stack, so judge it as IPv4.
  const mapped = addr.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isBlockedV4(mapped[1]);

  const head = parseInt(addr.split(":")[0] || "0", 16);
  if (Number.isNaN(head)) return true;
  if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((head & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedV4(ip);
  if (net.isIPv6(ip)) return isBlockedV6(ip);
  return true; // not an address we can reason about
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");

  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error("That address is not reachable from here.");
    return;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("Could not resolve that host.");
  }
  if (records.length === 0) throw new Error("Could not resolve that host.");
  // Every answer must be public: one private record is enough to abuse.
  if (records.some((r) => isBlockedIp(r.address))) {
    throw new Error("That address is not reachable from here.");
  }
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return Buffer.concat(chunks).subarray(0, MAX_BYTES).toString("utf8");
}

/** Fetch a user-supplied URL as text, refusing anything that is not a public
 *  http(s) document. Throws with a message safe to show the caller. */
export async function fetchPublicText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("That does not look like a valid URL.");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Only http and https URLs can be fetched.");
    }
    await assertPublicHost(url.hostname);

    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,text/plain" },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`Fetch failed (${res.status}).`);
      await res.body?.cancel().catch(() => {});
      url = new URL(location, url); // re-checked on the next pass
      continue;
    }

    if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/^\s*(text\/|application\/(xhtml\+xml|xml|json))/i.test(contentType)) {
      throw new Error("That URL did not return a text document.");
    }
    return readCapped(res);
  }

  throw new Error("Too many redirects.");
}
