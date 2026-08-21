import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seedUsers = [
  { username: "atlas_kt", points: 2410 },
  { username: "groundtruth", points: 2130 },
  { username: "shibuya_walker", points: 1875 },
  { username: "peripheral", points: 1540 },
  { username: "cartesian", points: 1310 },
  { username: "field_unit_07", points: 1180 },
  { username: "lowaltitude", points: 940 },
  { username: "streetlevel_ml", points: 720 },
  { username: "sensor_dense", points: 610 },
  { username: "waypoint_zero", points: 455 },
  { username: "curbside", points: 320 },
  { username: "first_capture", points: 180 },
];

const seedTasks = [
  {
    slug: "shibuya-crossing-street-level",
    title: "Shibuya crossing, walking clip",
    brief:
      "Record a short clip crossing the scramble at pedestrian height during a green light cycle. We need foot traffic density, signage state and storefront condition captured in motion. Daylight or night both accepted. Keep it under 20 seconds.",
    category: "location",
    locationName: "Shibuya, Tokyo, Japan",
    lat: 35.6595,
    lng: 139.7005,
    radiusM: 150,
    priceUsdc: 25,
    maxSubmissions: 20,
  },
  {
    slug: "ev-charging-station-in-use",
    title: "EV charging station in use",
    brief:
      "Record a short clip of a public EV charging station with at least one vehicle actively connected. Pan across the full unit including the connector, screen state and any queue behind it. Any city worldwide.",
    category: "object",
    priceUsdc: 12,
    maxSubmissions: 40,
  },
  {
    slug: "port-container-stack",
    title: "Container stacks at a working port",
    brief:
      "Ground level clip of stacked shipping containers from publicly accessible areas around a commercial port. We are mapping stack heights and yard utilization. Do not enter restricted zones.",
    category: "location",
    locationName: "Port of Rotterdam, Netherlands",
    lat: 51.9496,
    lng: 4.1453,
    radiusM: 5000,
    priceUsdc: 18,
    maxSubmissions: 15,
  },
  {
    slug: "construction-crane-skyline",
    title: "Active construction crane",
    brief:
      "Record a tower crane on an active construction site from street level with the surrounding block in frame. We track construction activity as a leading indicator. Include the site hoarding if possible.",
    category: "object",
    priceUsdc: 9,
    maxSubmissions: 60,
  },
  {
    slug: "grocery-shelf-produce",
    title: "Produce aisle, fully stocked or not",
    brief:
      "Film a supermarket produce section showing shelf stock levels as they are. Empty shelves are as valuable as full ones. Pan slowly across at least three meters of shelving.",
    category: "object",
    priceUsdc: 7,
    maxSubmissions: 80,
  },
  {
    slug: "brooklyn-bridge-pedestrian-deck",
    title: "Brooklyn Bridge pedestrian deck",
    brief:
      "Walkway level clip of the Brooklyn Bridge deck showing pedestrian and cyclist volume plus the current state of the dividing lane markings. Weekday and weekend samples both wanted.",
    category: "location",
    locationName: "Brooklyn Bridge, New York, United States",
    lat: 40.7061,
    lng: -73.9969,
    radiusM: 400,
    priceUsdc: 16,
    maxSubmissions: 25,
  },
  {
    slug: "warehouse-loading-dock",
    title: "Warehouse loading dock activity",
    brief:
      "From public roads only, record a distribution warehouse loading dock showing how many bays are occupied by trailers. We are building a ground level index of logistics utilization.",
    category: "object",
    priceUsdc: 14,
    maxSubmissions: 30,
  },
  {
    slug: "street-corner-anywhere",
    title: "Any street corner, your city",
    brief:
      "The coverage task. Stand at a street corner anywhere on Earth and record the intersection with visible street signage. Every clip extends the map. One per contributor.",
    category: "coverage",
    priceUsdc: 4,
    maxSubmissions: 500,
  },
  {
    slug: "solar-farm-perimeter",
    title: "Solar farm from the perimeter",
    brief:
      "Record a utility scale solar installation from its public perimeter. Panel angle, row spacing and vegetation state should be readable. Drone footage not accepted, this is a ground truth network.",
    category: "object",
    priceUsdc: 15,
    maxSubmissions: 20,
  },
  {
    slug: "la-defense-esplanade",
    title: "La Defense esplanade, midday",
    brief:
      "Street level clip of the Esplanade de La Defense between 11:00 and 14:00 local time showing foot traffic in the business district. We compare weekday presence against office occupancy estimates.",
    category: "location",
    locationName: "La Defense, Paris, France",
    lat: 48.8898,
    lng: 2.2419,
    radiusM: 600,
    priceUsdc: 17,
    maxSubmissions: 20,
  },
];

async function main() {
  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { privyId: `seed:${user.username}` },
      update: {},
      create: {
        privyId: `seed:${user.username}`,
        username: user.username,
        points: user.points,
        isSeed: true,
      },
    });
  }

  // The official buyer account that posted the launch bounties.
  const official = await prisma.user.upsert({
    where: { privyId: "seed:utopia_official" },
    update: {},
    create: {
      privyId: "seed:utopia_official",
      username: "utopia_official",
      points: 0,
      isSeed: true,
      isAdmin: true,
    },
  });

  for (const task of seedTasks) {
    const { slug, ...rest } = task;
    await prisma.task.upsert({
      where: { slug },
      update: {
        ...rest,
        depositNetwork: "usdc-base",
        creatorId: official.id,
        fundedAt: new Date(),
      },
      create: {
        slug,
        ...rest,
        depositNetwork: "usdc-base",
        creatorId: official.id,
        fundedAt: new Date(),
      },
    });
  }

  console.log(
    `Seeded ${seedUsers.length} contributors, the official buyer and ${seedTasks.length} tasks.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
