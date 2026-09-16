/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // bullmq optionally supports Valkey GLIDE as an alternative to ioredis;
    // we only use ioredis, so this optional peer dependency is never
    // installed. Without this, webpack emits a "Module not found" warning
    // on every build even though nothing actually needs it at runtime.
    config.resolve.alias["@valkey/valkey-glide"] = false;
    return config;
  },
};

export default nextConfig;
