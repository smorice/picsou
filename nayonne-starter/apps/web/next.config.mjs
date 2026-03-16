const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/nayonne";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
