/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
            // Allow server actions from the Vercel deployment domain and any
            // subdomains (for multi-tenant subdomain routing).
            // Without this, Next.js CSRF protection can block POSTs that come
            // from a different Origin than the deployment URL.
            allowedOrigins: [
                'localhost:3000',
                '*.vercel.app',
                '*.rearch.sa',
            ],
        },
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'drive.google.com' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: '*.supabase.co' },
            { protocol: 'https', hostname: '*.amazonaws.com' },
        ],
    },
}

export default nextConfig
