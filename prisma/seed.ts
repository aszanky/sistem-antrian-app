import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD = "password123";

const demos = [
  {
    slug: "demo-teller",
    name: "Demo Teller",
    timezone: "Asia/Jakarta",
    email: "teller@example.test",
    counters: ["Counter 1", "Counter 2"],
  },
  {
    slug: "demo-clinic",
    name: "Demo Clinic",
    timezone: "Asia/Jakarta",
    email: "clinic@example.test",
    counters: ["Registration", "Consultation"],
  },
];

async function main() {
  const passwordHash = await hash(PASSWORD);

  for (const demo of demos) {
    const business = await prisma.business.upsert({
      where: { slug: demo.slug },
      update: { name: demo.name, timezone: demo.timezone },
      create: {
        slug: demo.slug,
        name: demo.name,
        timezone: demo.timezone,
      },
    });

    for (const name of demo.counters) {
      await prisma.counter.upsert({
        where: { businessId_name: { businessId: business.id, name } },
        update: {},
        create: { businessId: business.id, name },
      });
    }

    await prisma.staffUser.upsert({
      where: { email: demo.email },
      update: { businessId: business.id, passwordHash },
      create: {
        businessId: business.id,
        email: demo.email,
        passwordHash,
      },
    });

    console.log(`${demo.name}: /q/${demo.slug} | ${demo.email} / ${PASSWORD}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
