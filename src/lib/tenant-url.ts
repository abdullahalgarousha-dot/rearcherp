/**
 * Builds a fully-qualified URL for a tenant subdomain.
 *
 * - Development  (hostname === "localhost"):  http://{slug}.localhost:{port}{path}
 * - Production:  https://{slug}.{NEXT_PUBLIC_BASE_DOMAIN}{path}
 *
 * Set NEXT_PUBLIC_BASE_DOMAIN in Vercel env vars (e.g. "rearcherp.vercel.app").
 * Falls back to stripping the first label off the current hostname so it works
 * even without the env var.
 */
export function buildTenantUrl(slug: string, path: string = "/dashboard"): string {
    // Safe to call from client components (window is available)
    const isLocalhost =
        typeof window !== "undefined" && window.location.hostname === "localhost"

    if (isLocalhost) {
        const port =
            typeof window !== "undefined" && window.location.port
                ? `:${window.location.port}`
                : ""
        return `http://${slug}.localhost${port}${path}`
    }

    // Production: prefer explicit env var, fall back to current root domain
    const baseDomain =
        process.env.NEXT_PUBLIC_BASE_DOMAIN ||
        (typeof window !== "undefined"
            ? window.location.hostname.split(".").slice(1).join(".") ||
              window.location.hostname
            : "rearcherp.vercel.app")

    return `https://${slug}.${baseDomain}${path}`
}
