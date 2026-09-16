import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const orgName = process.env.SEED_ORG_NAME ?? "Medora Pharmacy";
  const ownerName = process.env.SEED_OWNER_NAME ?? "Owner";
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD must be set (see .env.example) before seeding.",
    );
  }

  const org = await prisma.org.upsert({
    where: { id: "seed-org" },
    update: {},
    create: { id: "seed-org", name: orgName },
  });

  const branch = await prisma.branch.upsert({
    where: { id: "seed-branch-main" },
    update: {},
    create: {
      id: "seed-branch-main",
      orgId: org.id,
      name: `${orgName} — Main Branch`,
      isOnline: true,
    },
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const owner = await prisma.user.upsert({
    where: { orgId_email: { orgId: org.id, email: ownerEmail } },
    update: {},
    create: {
      orgId: org.id,
      branchId: branch.id,
      name: ownerName,
      email: ownerEmail,
      passwordHash,
      mustChangePassword: true,
      roles: [Role.OWNER],
    },
  });

  console.log("Seeded:");
  console.log(`  Org:    ${org.name} (${org.id})`);
  console.log(`  Branch: ${branch.name} (${branch.id})`);
  console.log(`  Owner:  ${owner.email} — sign in and change the password immediately.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
