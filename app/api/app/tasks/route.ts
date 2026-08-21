import { NextResponse } from "next/server";
import { prisma } from "@/lib/app/db";
import { getAuthUser } from "@/lib/app/auth";
import { DEPOSIT_NETWORKS, isValidTxHash, normalizeTxHash } from "@/lib/app/payments";

const CATEGORIES = ["location", "object", "coverage"];

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    brief?: string;
    category?: string;
    locationName?: string;
    lat?: number;
    lng?: number;
    radiusM?: number;
    priceUsdc?: number;
    maxSubmissions?: number;
    depositNetwork?: string;
    depositTxHash?: string;
  };

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 8 || title.length > 90) {
    return NextResponse.json(
      { error: "Title must be 8 to 90 characters." },
      { status: 400 }
    );
  }

  const brief = typeof body.brief === "string" ? body.brief.trim() : "";
  if (brief.length < 40 || brief.length > 1200) {
    return NextResponse.json(
      { error: "Brief must be 40 to 1200 characters." },
      { status: 400 }
    );
  }

  const category = CATEGORIES.includes(body.category ?? "")
    ? (body.category as string)
    : null;
  if (!category) {
    return NextResponse.json(
      { error: "Category must be location, object or coverage." },
      { status: 400 }
    );
  }

  const priceUsdc = Number(body.priceUsdc);
  if (!Number.isFinite(priceUsdc) || priceUsdc < 1 || priceUsdc > 100000) {
    return NextResponse.json(
      { error: "Price must be between 1 and 100,000 USDC." },
      { status: 400 }
    );
  }

  const maxSubmissions = Number.isInteger(body.maxSubmissions)
    ? Math.min(Math.max(body.maxSubmissions as number, 1), 1000)
    : 25;

  const depositNetwork = DEPOSIT_NETWORKS.some(
    (network) => network.id === body.depositNetwork
  )
    ? (body.depositNetwork as string)
    : null;
  if (!depositNetwork) {
    return NextResponse.json(
      { error: "Pick a deposit network." },
      { status: 400 }
    );
  }

  const depositTxHash =
    typeof body.depositTxHash === "string"
      ? normalizeTxHash(body.depositTxHash)
      : "";
  if (!isValidTxHash(depositTxHash)) {
    return NextResponse.json(
      { error: "Paste the transaction hash from your deposit." },
      { status: 400 }
    );
  }

  const locationName =
    typeof body.locationName === "string" && body.locationName.trim()
      ? body.locationName.trim().slice(0, 80)
      : undefined;
  const lat =
    typeof body.lat === "number" && Math.abs(body.lat) <= 90
      ? body.lat
      : undefined;
  const lng =
    typeof body.lng === "number" && Math.abs(body.lng) <= 180
      ? body.lng
      : undefined;
  const radiusM =
    typeof body.radiusM === "number" && body.radiusM > 0
      ? Math.min(Math.round(body.radiusM), 100000)
      : undefined;

  const base = slugify(title) || "bounty";
  const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;

  const task = await prisma.task.create({
    data: {
      slug,
      title,
      brief,
      category,
      locationName,
      lat,
      lng,
      radiusM,
      priceUsdc: Math.round(priceUsdc * 100) / 100,
      maxSubmissions,
      status: "open",
      depositNetwork,
      depositTxHash,
      fundedAt: new Date(),
      creatorId: user.id,
    },
  });

  return NextResponse.json({ task: { id: task.id, slug: task.slug } });
}
