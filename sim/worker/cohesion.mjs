import { BOUNTIES } from "./catalog.mjs";

/** Same metro, not the same country. NYC↔Elizabeth is fine; NYC↔London is not. */
export const METRO_KM = 90;

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function catalogPins() {
  return BOUNTIES.filter((row) => finite(row.lat) && finite(row.lng)).map(
    (row) => ({
      lat: row.lat,
      lng: row.lng,
      name: row.locationName || "",
    })
  );
}

export function clusterMetros(pins = catalogPins(), radiusKm = METRO_KM) {
  const sorted = [...pins].sort(
    (a, b) => a.lat - b.lat || a.lng - b.lng || a.name.localeCompare(b.name)
  );
  const clusters = [];
  for (const pin of sorted) {
    const hit = clusters.find((cluster) => haversineKm(cluster, pin) <= radiusKm);
    if (!hit) {
      clusters.push({ lat: pin.lat, lng: pin.lng });
    }
  }
  return clusters;
}

const METROS = clusterMetros();

export function assignedHome(username) {
  if (METROS.length === 0) return null;
  return METROS[hashString(String(username).toLowerCase()) % METROS.length];
}

export function taskPin(task) {
  if (finite(task?.lat) && finite(task?.lng)) {
    return { lat: task.lat, lng: task.lng };
  }
  const name = String(task?.locationName || "")
    .trim()
    .toLowerCase();
  if (!name) return null;
  const hit = catalogPins().find(
    (pin) => pin.name && pin.name.toLowerCase() === name
  );
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}

export function firstLocatedPin(submissions = []) {
  const ordered = [...submissions].sort((a, b) => {
    const aAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aAt - bAt;
  });
  for (const row of ordered) {
    const pin = taskPin(row.task || row);
    if (pin) return pin;
  }
  return null;
}

/** Largest filmed metro. Ties go to the earliest clip. */
export function dominantHome(submissions = []) {
  const located = submissions
    .map((row) => ({
      at: row.createdAt ? new Date(row.createdAt).getTime() : 0,
      pin: taskPin(row.task || row),
    }))
    .filter((row) => row.pin);
  if (located.length === 0) return null;
  const clusters = [];
  for (const row of located) {
    let hit = clusters.find((cluster) => sameMetro(cluster, row.pin));
    if (!hit) {
      hit = { lat: row.pin.lat, lng: row.pin.lng, n: 0, first: row.at };
      clusters.push(hit);
    }
    hit.n += 1;
    hit.first = Math.min(hit.first, row.at);
  }
  clusters.sort((a, b) => b.n - a.n || a.first - b.first);
  return { lat: clusters[0].lat, lng: clusters[0].lng };
}

/** Home is where they already filmed. Otherwise a stable assigned metro. */
export function userHome(username, submissions = []) {
  return dominantHome(submissions) || assignedHome(username);
}

export function sameMetro(a, b, radiusKm = METRO_KM) {
  if (!a || !b) return false;
  return haversineKm(a, b) <= radiusKm;
}

/**
 * Indoor / unlocated clips can happen at home. A located bounty must sit
 * in the user's metro. First located clip is always allowed.
 */
export function canUserClip(username, task, submissions = []) {
  const pin = taskPin(task);
  if (!pin) return true;
  const home = userHome(username, submissions);
  if (!home) return true;
  return sameMetro(home, pin);
}

export function nearbyTasks(username, tasks, submissions = []) {
  return tasks.filter((task) => canUserClip(username, task, submissions));
}

export function isIndoorTask(task) {
  return !taskPin(task);
}

export function clipSplit(submissions = []) {
  let indoor = 0;
  let located = 0;
  for (const row of submissions) {
    if (taskPin(row.task || row)) located += 1;
    else indoor += 1;
  }
  return { indoor, located };
}

/** Street / city clips. Indoor does not count. */
export const MAX_LOCATED_CLIPS = 2;
