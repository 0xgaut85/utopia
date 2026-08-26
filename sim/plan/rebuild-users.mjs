import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NAMES } from "./names.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;
const IMAGE = /\.(jpe?g|png|webp)$/i;

/** 30 of the 50 leaderboard slots. Real signup accounts are left alone. */
const LEADERBOARD_PFPS = [
  "0xDaegon",
  "jake_97",
  "0xMiles",
  "chris_b",
  "jexu",
  "Seltz",
  "0xNash",
  "lucy_02",
  "fyro",
  "Amelia_w",
  "pexu",
  "nortz",
  "voxz",
  "Tennzyk",
  "orix_na",
  "noah_nyc",
  "OliviaM",
  "mason1997",
  "Harper_uk",
  "ethan02",
  "jack_88",
  "CharlotteW",
  "george_b",
  "Megan91",
  "ryan_uk",
  "NathanJ",
  "grace_02",
  "tyler88",
  "Connor97",
  "katie_uk",
];

const files = readdirSync(join(root, "public/sim-avatars"))
  .filter((name) => IMAGE.test(name))
  .sort();
if (files.length < LEADERBOARD_PFPS.length) {
  throw new Error(
    `need ${LEADERBOARD_PFPS.length} avatars, have ${files.length}`
  );
}

const users = JSON.parse(readFileSync(join(here, "users.json"), "utf8"));
if (NAMES.length !== 300) throw new Error(`NAMES ${NAMES.length}`);
if (users.length !== 300) throw new Error(`users ${users.length}`);

const seen = new Set();
const errors = [];
for (const [name] of NAMES) {
  if (!USERNAME.test(name)) errors.push(`bad ${name}`);
  const key = name.toLowerCase();
  if (seen.has(key)) errors.push(`dup ${name}`);
  seen.add(key);
  if (/^0x[a-f0-9]{6,}$/.test(key)) errors.push(`hex ${name}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const pfpAt = new Map(
  LEADERBOARD_PFPS.map((name, index) => [name.toLowerCase(), files[index]])
);
const missing = LEADERBOARD_PFPS.filter(
  (name) => !NAMES.some(([row]) => row.toLowerCase() === name.toLowerCase())
);
if (missing.length) {
  throw new Error(`unknown leaderboard pfp users: ${missing.join(" ")}`);
}

const next = users.map((row, index) => {
  const [username, style] = NAMES[index];
  const { avatarKind, ...rest } = row;
  return {
    ...rest,
    username,
    style,
    avatar: pfpAt.get(username.toLowerCase()) || null,
  };
});

const urls = next.map((row) => row.avatar).filter(Boolean);
if (urls.length !== LEADERBOARD_PFPS.length) {
  throw new Error(`assigned ${urls.length} of ${LEADERBOARD_PFPS.length}`);
}
if (new Set(urls).size !== urls.length) {
  throw new Error("duplicate avatars");
}

writeFileSync(join(here, "users.json"), `${JSON.stringify(next, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      files: files.length,
      assigned: urls.length,
      first50: next.slice(0, 50).filter((row) => row.avatar).length,
      laterWithAvatar: next.slice(50).filter((row) => row.avatar).length,
      withAvatar: next
        .filter((row) => row.avatar)
        .map((row) => row.username)
        .join(" "),
    },
    null,
    2
  )
);
