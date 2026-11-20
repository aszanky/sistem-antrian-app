export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Dynamic import keeps Prisma out of the edge instrumentation bundle.
  const { prisma } = await import("./lib/db");
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    // The first request will surface a real connection error.
  }
}
