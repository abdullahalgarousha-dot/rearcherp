/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
    // Don't fail the production build on ESLint warnings
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Don't fail the production build on TypeScript errors
    // (remove once all type errors are fully resolved)
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'drive.google.com',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            // Supabase Storage (current DB host)
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
            // Neon / generic S3-compatible object storage
            {
                protocol: 'https',
                hostname: '*.amazonaws.com',
            },
        ],
    },
};

export default nextConfig;
