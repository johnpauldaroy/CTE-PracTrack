import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma Client is generated to a custom output path (src/generated/prisma)
  // instead of node_modules, so Next's serverless file tracer needs an
  // explicit hint to bundle the query engine binary with deployed functions
  // — otherwise Vercel throws PrismaClientInitializationError at runtime.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
