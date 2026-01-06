import { prisma } from "@/lib/prisma";

export async function getSetting(key: string, fallback = "") {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getSettings(keys: string[]) {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: keys } }
  });
  const map = new Map(rows.map(r => [r.key, r.value]));
  return Object.fromEntries(keys.map(k => [k, map.get(k) ?? ""]));
}

export async function setSettings(pairs: Record<string, string>) {
  const entries = Object.entries(pairs);

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) }
      })
    )
  );
}

export async function getSettingJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await getSetting(key, "");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getSettingInt(key: string, fallback: number) {
  const raw = await getSetting(key, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getSettingBool(key: string, fallback: boolean) {
  const raw = await getSetting(key, "");
  if (!raw) return fallback;
  return raw === "true";
}

