import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NAMES } from "./names.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;
const IMAGE = /\.(jpe?g|png|webp)$/i;

const files = readdirSync(join(root, "public/sim-avatars"))
  .filter((name) => IMAGE.test(name))
  .sort();
if (files.length < 1) throw new Error("no files in public/sim-avatars");

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

const launchCount = users.filter((row) => row.launch).length;
const laterSlots = Math.max(0, files.length - launchCount);
const laterIndexes = [];
for (let i = 0; i < laterSlots; i += 1) {
  laterIndexes.push(launchCount + Math.floor((i * (users.length - launchCount)) / laterSlots));
}
const withAvatar = new Set([
  ...users.slice(0, Math.min(launchCount, files.length)).map((_, index) => index),
  ...laterIndexes,
]);

let fileIndex = 0;
const next = users.map((row, index) => {
  const [username, style] = NAMES[index];
  const { avatarKind, ...rest } = row;
  const avatar = withAvatar.has(index) ? files[fileIndex++] : null;
  return { ...rest, username, style, avatar };
});
if (fileIndex !== files.length) {
  throw new Error(`assigned ${fileIndex} of ${files.length} files`);
}

const urls = next.map((row) => row.avatar).filter(Boolean);
if (new Set(urls).size !== urls.length) {
  throw new Error("duplicate avatars");
}

writeFileSync(join(here, "users.json"), `${JSON.stringify(next, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      files: files.length,
      assigned: urls.length,
      launchWithAvatar: next.filter((row) => row.launch && row.avatar).length,
      laterWithAvatar: next.filter((row) => !row.launch && row.avatar).length,
      launch: next
        .filter((row) => row.launch)
        .map((row) => `${row.username}${row.avatar ? "*" : ""}`)
        .join(" "),
    },
    null,
    2
  )
);
