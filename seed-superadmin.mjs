import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);

  // Try to find existing super admin
  const existing = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", deletedAt: null },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: hash, email: "superadmin@gymos.com" },
    });
    console.log("Super admin updated:", existing.email, "->", "superadmin@gymos.com");
  } else {
    const user = await prisma.user.create({
      data: {
        gymId: null,
        fullName: "Super Admin",
        email: "superadmin@gymos.com",
        passwordHash: hash,
        role: "SUPER_ADMIN",
      },
    });
    console.log("Super admin created:", user.email, user.role);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
