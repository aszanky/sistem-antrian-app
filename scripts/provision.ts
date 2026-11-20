import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Options = {
  slug: string;
  name: string;
  timezone: string;
  counters: string[];
  staffEmail: string;
  staffPassword: string;
};

function parseArgs(argv: string[]): Options {
  const values: Record<string, string[]> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    values[argument.slice(2)] ??= [];
    values[argument.slice(2)].push(value);
    index += 1;
  }

  const single = (key: string) => {
    const found = values[key]?.[0];
    if (!found) throw new Error(`Missing --${key}`);
    return found;
  };

  const counters = values.counter ?? [];
  if (counters.length === 0) throw new Error("Provide at least one --counter");
  const timezone = single("timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new Error(`Unknown timezone: ${timezone}`);
  }

  return {
    slug: single("slug"),
    name: single("name"),
    timezone,
    counters,
    staffEmail: single("staff-email"),
    staffPassword: single("staff-password"),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const passwordHash = await hash(options.staffPassword);

  await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        slug: options.slug,
        name: options.name,
        timezone: options.timezone,
      },
    });
    for (const name of options.counters) {
      await tx.counter.create({ data: { businessId: business.id, name } });
    }
    await tx.staffUser.create({
      data: {
        businessId: business.id,
        email: options.staffEmail,
        passwordHash,
      },
    });
  });

  console.log(`Provisioned ${options.name}`);
  console.log(`Queue page: /q/${options.slug}`);
  console.log(`Staff login: ${options.staffEmail}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
