import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seedUsers = await prisma.user.findMany({
    where: { isSeed: true },
    select: { id: true },
  });
  const seedIds = seedUsers.map((user) => user.id);

  const tasks = await prisma.task.deleteMany({
    where: {
      OR: [
        { creatorId: { in: seedIds } },
        {
          slug: {
            in: [
              "shibuya-crossing-street-level",
              "ev-charging-station-in-use",
              "port-container-stack",
              "construction-crane-skyline",
              "grocery-shelf-produce",
              "brooklyn-bridge-pedestrian-deck",
              "warehouse-loading-dock",
              "street-corner-anywhere",
              "solar-farm-perimeter",
              "la-defense-esplanade",
            ],
          },
        },
      ],
    },
  });

  const users = await prisma.user.deleteMany({
    where: { isSeed: true },
  });

  console.log(`Removed ${tasks.count} seed bounties and ${users.count} seed users.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
