import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { setSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const keys = url.searchParams.getAll("key");

  if (!keys.length) {
    return NextResponse.json({ error: "No keys provided" }, { status: 400 });
  }

  const rows = await prisma.appSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true, updatedAt: true },
  });

  const data: Record<string, string> = {};
  let lastUpdatedAt: string | null = null;

  for (const r of rows) {
    data[r.key] = r.value;
    const ts = r.updatedAt?.toISOString?.() ?? null;
    if (ts && (!lastUpdatedAt || ts > lastUpdatedAt)) {
      lastUpdatedAt = ts;
    }
  }

  // Fill in missing keys with empty strings
  for (const key of keys) {
    if (!(key in data)) {
      data[key] = "";
    }
  }

  return NextResponse.json({ data, lastUpdatedAt });
}

export async function POST(req: Request) {
  await requireAdmin();

  const body = await req.json().catch(() => null);
  if (!body?.pairs || typeof body.pairs !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await setSettings(body.pairs);
  return NextResponse.json({ ok: true });
}

