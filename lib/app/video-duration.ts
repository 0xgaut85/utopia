/** In-app clips must be at least this long to count for submit points. */
export const MIN_CLIP_SECONDS = 10;

function readVint(buf: Buffer, offset: number, keepMarker = false) {
  if (offset >= buf.length) return null;
  const first = buf[offset];
  let width = 1;
  let mask = 0x80;
  while (width <= 8 && (first & mask) === 0) {
    width += 1;
    mask >>= 1;
  }
  if (width > 8 || offset + width > buf.length) return null;
  let value = keepMarker ? first : first & (mask - 1);
  for (let i = 1; i < width; i += 1) {
    value = (value << 8) | buf[offset + i];
  }
  return { value, width };
}

function readFloat(buf: Buffer, offset: number, size: number) {
  if (size === 4) return buf.readFloatBE(offset);
  if (size === 8) return buf.readDoubleBE(offset);
  return null;
}

function webmDurationSeconds(buf: Buffer) {
  let offset = 0;
  let scale = 1_000_000;
  let duration: number | null = null;
  let lastTimecode = 0;
  let foundCluster = false;
  let steps = 0;

  while (offset < buf.length - 1 && steps < 80_000) {
    steps += 1;
    const id = readVint(buf, offset, true);
    if (!id) break;
    const size = readVint(buf, offset + id.width);
    if (!size) break;
    const start = offset + id.width + size.width;
    const unknown = size.value === 0x7f || size.value === 0xff;
    const end = unknown
      ? buf.length
      : Math.min(buf.length, start + size.value);
    if (end < start) break;

    if (id.value === 0x2ad7b1 && size.value > 0 && size.value <= 8) {
      let value = 0;
      for (let i = 0; i < size.value; i += 1) value = (value << 8) | buf[start + i];
      if (value > 0) scale = value;
    } else if (id.value === 0x4489) {
      const parsed = readFloat(buf, start, size.value);
      if (parsed && Number.isFinite(parsed) && parsed > 0) duration = parsed;
    } else if (id.value === 0x1f43b675) {
      foundCluster = true;
      let inner = start;
      while (inner < end - 1) {
        const childId = readVint(buf, inner, true);
        if (!childId) break;
        const childSize = readVint(buf, inner + childId.width);
        if (!childSize) break;
        const childStart = inner + childId.width + childSize.width;
        const childEnd = Math.min(end, childStart + childSize.value);
        if (childId.value === 0xe7 && childSize.value > 0 && childSize.value <= 8) {
          let value = 0;
          for (let i = 0; i < childSize.value; i += 1) {
            value = (value << 8) | buf[childStart + i];
          }
          lastTimecode = Math.max(lastTimecode, value);
        }
        if (childEnd <= inner) break;
        inner = childEnd;
      }
    }

    if (end <= offset) break;
    offset = id.value === 0x18538067 || id.value === 0x1549a966 ? start : end;
  }

  if (duration && duration > 0) {
    const seconds = (duration * scale) / 1e9;
    if (seconds > 0.2 && seconds < 600) return seconds;
    if (duration > 0.2 && duration < 600) return duration;
  }
  if (foundCluster && lastTimecode > 0) {
    const seconds = (lastTimecode * scale) / 1e9;
    if (seconds > 0.2 && seconds < 600) return seconds;
  }
  return null;
}

function mp4DurationSeconds(buf: Buffer): number | null {
  let offset = 0;
  while (offset + 8 <= buf.length) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    if (size === 1 && offset + 16 <= buf.length) {
      size = Number(buf.readBigUInt64BE(offset + 8));
    }
    if (size < 8) break;
    const next = offset + size;
    if (type === "moov" || type === "trak" || type === "mdia") {
      const nested = mp4DurationSeconds(buf.subarray(offset + 8, next));
      if (nested) return nested;
    }
    if (type === "mvhd" && offset + 32 <= buf.length) {
      const version = buf[offset + 8];
      if (version === 1 && offset + 36 <= buf.length) {
        const timescale = buf.readUInt32BE(offset + 28);
        const duration = Number(buf.readBigUInt64BE(offset + 32));
        if (timescale > 0 && duration > 0) return duration / timescale;
      } else if (version === 0) {
        const timescale = buf.readUInt32BE(offset + 20);
        const duration = buf.readUInt32BE(offset + 24);
        if (timescale > 0 && duration > 0) return duration / timescale;
      }
    }
    if (next <= offset) break;
    offset = next;
  }
  return null;
}

export function videoDurationSeconds(dataUrl: string): number | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  let buf: Buffer;
  try {
    buf = Buffer.from(dataUrl.slice(comma + 1), "base64");
  } catch {
    return null;
  }
  if (buf.length < 32) return null;
  const header = dataUrl.slice(0, comma).toLowerCase();
  if (header.includes("webm")) return webmDurationSeconds(buf);
  if (header.includes("mp4") || header.includes("quicktime")) {
    return mp4DurationSeconds(buf);
  }
  return webmDurationSeconds(buf) ?? mp4DurationSeconds(buf);
}

const MIN_BYTES_FOR_10S = 150_000;

export function clipMeetsMinDuration(
  dataUrl: string,
  claimedSec?: number | null
) {
  const seconds = videoDurationSeconds(dataUrl);
  if (seconds !== null) return seconds + 0.25 >= MIN_CLIP_SECONDS;
  const comma = dataUrl.indexOf(",");
  const bytes =
    comma >= 0 ? Math.floor(((dataUrl.length - comma - 1) * 3) / 4) : 0;
  return (
    typeof claimedSec === "number" &&
    Number.isFinite(claimedSec) &&
    claimedSec >= MIN_CLIP_SECONDS &&
    claimedSec <= 30 &&
    bytes >= MIN_BYTES_FOR_10S
  );
}
