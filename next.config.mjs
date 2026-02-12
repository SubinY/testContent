const isStaticExport = process.env.NEXT_OUTPUT_MODE === "export";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isStaticExport ? "export" : undefined,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
