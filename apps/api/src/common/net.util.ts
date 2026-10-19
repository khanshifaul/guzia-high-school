// src/common/net.util.ts — shared host/URL checks for outbound requests
// (provider base URLs and user-supplied source URLs).

export const ALWAYS_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** True when host is a private/reserved IP that must be blocked by default. */
export function isPrivateOrReservedHost(host: string): boolean {
    const h = host.toLowerCase();
    if (ALWAYS_ALLOWED_HOSTS.has(h)) return false;
    if (
        h.startsWith('127.') ||
        h.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h) ||
        h.startsWith('192.168.') ||
        h.startsWith('169.254.') ||
        h === '0.0.0.0'
    ) {
        return true;
    }
    // IPv6 unique local (fc00::/7), link-local (fe80::/10).
    if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8')) return true;
    return false;
}

/** Validate an outbound http(s) URL. Returns an error message or null. */
export function validateOutboundUrl(raw: string, allowedHosts = ''): string | null {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return 'Invalid URL.';
    }
    if (!/^https?:$/.test(url.protocol)) {
        return 'Only http:// and https:// URLs are allowed.';
    }
    const host = url.hostname;
    const allowed =
        ALWAYS_ALLOWED_HOSTS.has(host) ||
        !isPrivateOrReservedHost(host) ||
        allowedHosts
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .includes(host);
    if (!allowed) {
        return `Host "${host}" is not allowlisted.`;
    }
    return null;
}
