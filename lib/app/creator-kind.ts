export const CREATOR_KINDS = [
  "ai_lab",
  "robotics_team",
  "private",
  "user",
] as const;

export type CreatorKind = (typeof CREATOR_KINDS)[number];

export const CREATOR_KIND_OPTIONS: {
  id: CreatorKind;
  name: string;
  hint: string;
}[] = [
  { id: "ai_lab", name: "AI Lab", hint: "Posted by an AI lab" },
  {
    id: "robotics_team",
    name: "Robotics Team",
    hint: "Posted by a robotics team",
  },
  { id: "private", name: "Private", hint: "Buyer stays unnamed" },
  { id: "user", name: "User", hint: "Show your username" },
];

export function isCreatorKind(value: unknown): value is CreatorKind {
  return (
    typeof value === "string" &&
    (CREATOR_KINDS as readonly string[]).includes(value)
  );
}

export function creatorKindLabel(kind: string | null | undefined) {
  const option = CREATOR_KIND_OPTIONS.find((entry) => entry.id === kind);
  return option?.name ?? "Private";
}

/**
 * What the marketplace shows as the bounty poster. The "user" kind reveals
 * the creator's real username; every other kind stays anonymous.
 */
export function creatorDisplay(
  kind: string | null | undefined,
  username: string | null | undefined
) {
  if (kind === "user" && username) return username;
  return creatorKindLabel(kind);
}
