import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NAMES } from "./names.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;

const FILM = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2e11?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1521119989659-a323679ec341?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1525134479668-1bee5c7c9578?auto=format&fit=crop&w=160&h=160&q=80",
  "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=160&h=160&q=80",
];

const ANIME = ["lorelei", "adventurer", "notionists", "open-peeps", "avataaars", "micah"];
const NFT_NOUNS = [2, 8, 17, 23, 41, 55, 72, 88];

function dicebear(style, seed) {
  return `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(seed)}&size=160`;
}

function avatarFor(index, username) {
  if (index % 3 !== 0) return null;
  const slot = Math.floor(index / 3);
  if (slot < NFT_NOUNS.length) {
    return `https://noun.pics/${NFT_NOUNS[slot]}.png`;
  }
  const filmIndex = slot - NFT_NOUNS.length;
  if (filmIndex < FILM.length) return FILM[filmIndex];
  return dicebear(ANIME[slot % ANIME.length], `sim-avatar-${username}`);
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

const next = users.map((row, index) => {
  const [username, style] = NAMES[index];
  const avatar = avatarFor(index, username);
  const { avatarKind, ...rest } = row;
  return { ...rest, username, style, avatar };
});

const urls = next.map((row) => row.avatar).filter(Boolean);
const unique = new Set(urls);
if (unique.size !== urls.length) {
  throw new Error(`duplicate avatars ${urls.length - unique.size}`);
}

writeFileSync(join(here, "users.json"), `${JSON.stringify(next, null, 2)}\n`);

const kinds = { none: 0, film: 0, anime: 0, nft: 0 };
for (const row of next) {
  if (!row.avatar) kinds.none += 1;
  else if (row.avatar.includes("unsplash")) kinds.film += 1;
  else if (row.avatar.includes("noun.pics") || /pixel-art|bottts/.test(row.avatar)) {
    kinds.nft += 1;
  } else kinds.anime += 1;
}

console.log(
  JSON.stringify(
    {
      users: next.length,
      avatars: urls.length,
      unique: unique.size,
      kinds,
      launch: next
        .filter((row) => row.launch)
        .map((row) => `${row.username}${row.avatar ? "*" : ""}`)
        .join(" "),
    },
    null,
    2
  )
);
