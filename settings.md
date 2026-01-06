Alright Bhuti — here’s the **full Admin Settings Implementation Pack** (Next.js App Router + Prisma), built for **only 2 dashboards: Admin + Driver**.

You’ll end up with:

* ✅ `/admin/settings/*` pages (Company, Payments, Notifications, Contracts, Onboarding, System, Admin Accounts)
* ✅ Settings stored as **key-value** in DB (easy to extend)
* ✅ Secrets (Stripe/Resend keys) **NOT stored in DB** — only “Configured ✅ / Missing ❌” status shown
* ✅ Simple API routes for **load/save**
* ✅ Clean UI (tabs + forms)

---

# 0) Folder & Route Map

Create these routes:

* `/admin/settings/company`
* `/admin/settings/payments`
* `/admin/settings/notifications`
* `/admin/settings/contracts`
* `/admin/settings/onboarding`
* `/admin/settings/system`
* `/admin/settings/admin-accounts`

---

# 1) Prisma: Settings Table

## 1.1 Add model to `prisma/schema.prisma`

```prisma
model AppSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

## 1.2 Push DB

```bash
pnpm prisma db push
```

---

# 2) Seed default settings (recommended)

Create: `prisma/seed.ts`

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaults: Record<string, any> = {
    // Company
    "company.name": "FleetHub",
    "company.email": "",
    "company.phone": "",
    "company.whatsapp": "",
    "company.address": "",
    "company.currency": "ZAR",
    "company.bankDetails": "",

    // Payments
    "payments.mode": "MANUAL", // MANUAL | STRIPE
    "payments.rentCycleDefault": "MONTHLY", // WEEKLY | MONTHLY
    "payments.graceDays": "3",
    "payments.lateFeeEnabled": "false",
    "payments.lateFeeType": "FLAT", // FLAT | PERCENT
    "payments.lateFeeValue": "0",
    "payments.autoGenerateNext": "true",

    // Notifications
    "notifications.enabled": "true",
    "notifications.reminderBeforeDays": "3",
    "notifications.reminderOnDueDate": "true",
    "notifications.reminderOverdueAfterDays": "3",
    "notifications.fromEmail": "",
    "notifications.template.paymentReminder": "Hi {{driverName}}, your rental payment of {{amount}} is due on {{dueDate}}.",
    "notifications.template.overdueNotice": "Hi {{driverName}}, your payment of {{amount}} is overdue since {{dueDate}}.",
    "notifications.template.docApproved": "Hi {{driverName}}, your document was approved.",
    "notifications.template.docRejected": "Hi {{driverName}}, your document was rejected: {{reason}}.",

    // Contracts & pricing
    "contracts.default.carAmount": "0",
    "contracts.default.bikeAmount": "0",
    "contracts.depositEnabled": "false",
    "contracts.depositAmount": "0",
    "contracts.allowedFrequencies": JSON.stringify(["WEEKLY", "MONTHLY"]),
    "contracts.termsText": "Rental terms go here...",

    // Onboarding
    "onboarding.locationRequired": "true",
    "onboarding.requiredFields": JSON.stringify([
      "fullName",
      "idNumber",
      "address",
      "driverPhoto"
    ]),
    "onboarding.requiredDocuments": JSON.stringify([
      "CERTIFIED_ID",
      "PROOF_OF_RESIDENCE",
      "DRIVERS_LICENSE"
    ]),
    "onboarding.progressWeights": JSON.stringify({
      profile: 40,
      documents: 40,
      location: 20
    }),

    // System
    "system.maintenanceMode": "false"
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) }
    });
  }

  console.log("✅ Seeded AppSetting defaults");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Update `package.json`:

```json
{
  "scripts": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run:

```bash
pnpm seed
```

> If you already have seeding set up, merge the code.

---

# 3) Settings helper (server-side)

Create: `src/lib/settings.ts` (or `lib/settings.ts` depending on your structure)

```ts
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
```

---

# 4) Admin protection helper

Create: `src/lib/require-admin.ts`

```ts
import { redirect } from "next/navigation";
// Use whatever your project already uses:
// - auth() from "@/auth"
// - getServerSession from "next-auth"
// - your own session helper
import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  // Adjust to your project’s role field:
  // common: session.user.role === "ADMIN"
  if ((session.user as any).role !== "ADMIN") redirect("/driver");

  return session;
}
```

> If your project uses `getServerSession`, swap `auth()` accordingly.

---

# 5) API: Load/Save settings

Create: `app/api/admin/settings/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { getSettings, setSettings } from "@/lib/settings";

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const keys = url.searchParams.getAll("key");

  if (!keys.length) {
    return NextResponse.json({ error: "No keys provided" }, { status: 400 });
  }

  const data = await getSettings(keys);
  return NextResponse.json({ data });
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
```

---

# 6) Settings UI Layout (tabs)

## 6.1 Create layout: `app/admin/settings/layout.tsx`

```tsx
import { requireAdmin } from "@/lib/require-admin";
import Link from "next/link";

const tabs = [
  { href: "/admin/settings/company", label: "Company" },
  { href: "/admin/settings/payments", label: "Payments" },
  { href: "/admin/settings/notifications", label: "Notifications" },
  { href: "/admin/settings/contracts", label: "Contracts" },
  { href: "/admin/settings/onboarding", label: "Onboarding" },
  { href: "/admin/settings/system", label: "System" },
  { href: "/admin/settings/admin-accounts", label: "Admin Accounts" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage system configuration for Admin + Driver dashboards.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-1 rounded-md border text-sm hover:bg-muted"
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div>{children}</div>
    </div>
  );
}
```

---

# 7) Reusable client form helper

Create: `app/admin/settings/_components/save-bar.tsx`

```tsx
"use client";

import { useState } from "react";

export function SaveBar({ onSave }: { onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <button
        className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try { await onSave(); }
          finally { setSaving(false); }
        }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
```

---

# 8) Settings Pages (each one)

Each page:

* server loads current values (GET)
* client edits and saves (POST `/api/admin/settings`)

---

## 8.1 Company Page

### `app/admin/settings/company/page.tsx`

```tsx
import { requireAdmin } from "@/lib/require-admin";
import { getSettings } from "@/lib/settings";
import CompanyClient from "./company-client";

export default async function CompanySettingsPage() {
  await requireAdmin();

  const keys = [
    "company.name",
    "company.email",
    "company.phone",
    "company.whatsapp",
    "company.address",
    "company.currency",
    "company.bankDetails",
  ];

  const values = await getSettings(keys);
  return <CompanyClient initial={values} />;
}
```

### `app/admin/settings/company/company-client.tsx`

```tsx
"use client";

import { useState } from "react";
import { SaveBar } from "../_components/save-bar";

export default function CompanyClient({ initial }: { initial: Record<string, string> }) {
  const [s, setS] = useState(initial);

  async function save() {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: s }),
    });
  }

  const input = (key: string, label: string) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={s[key] ?? ""}
        onChange={(e) => setS({ ...s, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-6 border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Company</h2>
        <SaveBar onSave={save} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {input("company.name", "Company Name")}
        {input("company.email", "Company Email")}
        {input("company.phone", "Phone")}
        {input("company.whatsapp", "WhatsApp")}
        {input("company.currency", "Currency (ZAR)")}
        {input("company.address", "Address")}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Banking Details (EFT)</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]"
          value={s["company.bankDetails"] ?? ""}
          onChange={(e) => setS({ ...s, ["company.bankDetails"]: e.target.value })}
        />
      </div>
    </div>
  );
}
```

---

## 8.2 Payments Page (Manual vs Stripe + rules)

### `app/admin/settings/payments/page.tsx`

```tsx
import { requireAdmin } from "@/lib/require-admin";
import { getSettings } from "@/lib/settings";
import PaymentsSettingsClient from "./payments-client";

export default async function PaymentsSettingsPage() {
  await requireAdmin();

  const keys = [
    "payments.mode",
    "payments.rentCycleDefault",
    "payments.graceDays",
    "payments.lateFeeEnabled",
    "payments.lateFeeType",
    "payments.lateFeeValue",
    "payments.autoGenerateNext",
  ];

  const values = await getSettings(keys);

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  return <PaymentsSettingsClient initial={values} stripeConfigured={stripeConfigured} />;
}
```

### `app/admin/settings/payments/payments-client.tsx`

```tsx
"use client";

import { useState } from "react";
import { SaveBar } from "../_components/save-bar";

export default function PaymentsSettingsClient({
  initial,
  stripeConfigured,
}: {
  initial: Record<string, string>;
  stripeConfigured: boolean;
}) {
  const [s, setS] = useState(initial);

  async function save() {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: s }),
    });
  }

  const bool = (key: string) => (s[key] ?? "false") === "true";

  return (
    <div className="space-y-6 border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Payments & Billing</h2>
        <SaveBar onSave={save} />
      </div>

      <div className="border rounded-lg p-4 text-sm">
        <div className="font-medium mb-1">Stripe keys</div>
        <div>
          Status:{" "}
          {stripeConfigured ? (
            <span className="text-green-600 font-medium">Configured ✅</span>
          ) : (
            <span className="text-red-600 font-medium">Missing ❌</span>
          )}
        </div>
        <div className="text-muted-foreground mt-2">
          Keys must be set in <code>.env.local</code> (not saved in DB).
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Payment Mode</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["payments.mode"] ?? "MANUAL"}
            onChange={(e) => setS({ ...s, ["payments.mode"]: e.target.value })}
          >
            <option value="MANUAL">Manual (EFT/Cash)</option>
            <option value="STRIPE">Stripe (online)</option>
          </select>
          {!stripeConfigured && s["payments.mode"] === "STRIPE" && (
            <p className="text-xs text-red-600 mt-1">Stripe selected but keys are missing.</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Default Rent Cycle</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["payments.rentCycleDefault"] ?? "MONTHLY"}
            onChange={(e) => setS({ ...s, ["payments.rentCycleDefault"]: e.target.value })}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Grace Period (days)</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["payments.graceDays"] ?? "3"}
            onChange={(e) => setS({ ...s, ["payments.graceDays"]: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={bool("payments.autoGenerateNext")}
            onChange={(e) => setS({ ...s, ["payments.autoGenerateNext"]: String(e.target.checked) })}
          />
          <label className="text-sm font-medium">Auto-generate next payment</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={bool("payments.lateFeeEnabled")}
            onChange={(e) => setS({ ...s, ["payments.lateFeeEnabled"]: String(e.target.checked) })}
          />
          <label className="text-sm font-medium">Enable late fees</label>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Late Fee Type</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["payments.lateFeeType"] ?? "FLAT"}
            onChange={(e) => setS({ ...s, ["payments.lateFeeType"]: e.target.value })}
            disabled={!bool("payments.lateFeeEnabled")}
          >
            <option value="FLAT">Flat amount</option>
            <option value="PERCENT">Percent</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Late Fee Value</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["payments.lateFeeValue"] ?? "0"}
            onChange={(e) => setS({ ...s, ["payments.lateFeeValue"]: e.target.value })}
            disabled={!bool("payments.lateFeeEnabled")}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 8.3 Notifications Page (Resend status + templates)

### `app/admin/settings/notifications/page.tsx`

```tsx
import { requireAdmin } from "@/lib/require-admin";
import { getSettings } from "@/lib/settings";
import NotificationsClient from "./notifications-client";

export default async function NotificationsSettingsPage() {
  await requireAdmin();

  const keys = [
    "notifications.enabled",
    "notifications.fromEmail",
    "notifications.reminderBeforeDays",
    "notifications.reminderOnDueDate",
    "notifications.reminderOverdueAfterDays",
    "notifications.template.paymentReminder",
    "notifications.template.overdueNotice",
    "notifications.template.docApproved",
    "notifications.template.docRejected",
  ];

  const values = await getSettings(keys);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  return <NotificationsClient initial={values} resendConfigured={resendConfigured} />;
}
```

### `app/admin/settings/notifications/notifications-client.tsx`

```tsx
"use client";

import { useState } from "react";
import { SaveBar } from "../_components/save-bar";

export default function NotificationsClient({
  initial,
  resendConfigured,
}: {
  initial: Record<string, string>;
  resendConfigured: boolean;
}) {
  const [s, setS] = useState(initial);

  async function save() {
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: s }),
    });
  }

  const bool = (key: string) => (s[key] ?? "false") === "true";

  const textarea = (key: string, label: string, hint?: string) => (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <textarea
        className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
        value={s[key] ?? ""}
        onChange={(e) => setS({ ...s, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-6 border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Notifications</h2>
        <SaveBar onSave={save} />
      </div>

      <div className="border rounded-lg p-4 text-sm">
        <div className="font-medium mb-1">Resend API</div>
        <div>
          Status:{" "}
          {resendConfigured ? (
            <span className="text-green-600 font-medium">Configured ✅</span>
          ) : (
            <span className="text-red-600 font-medium">Missing ❌</span>
          )}
        </div>
        <div className="text-muted-foreground mt-2">
          Set <code>RESEND_API_KEY</code> in <code>.env.local</code>.
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={bool("notifications.enabled")}
          onChange={(e) => setS({ ...s, ["notifications.enabled"]: String(e.target.checked) })}
        />
        <label className="text-sm font-medium">Enable notifications</label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">From Email</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["notifications.fromEmail"] ?? ""}
            onChange={(e) => setS({ ...s, ["notifications.fromEmail"]: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Remind before (days)</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["notifications.reminderBeforeDays"] ?? "3"}
            onChange={(e) => setS({ ...s, ["notifications.reminderBeforeDays"]: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={bool("notifications.reminderOnDueDate")}
            onChange={(e) => setS({ ...s, ["notifications.reminderOnDueDate"]: String(e.target.checked) })}
          />
          <label className="text-sm font-medium">Remind on due date</label>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Overdue reminder after (days)</label>
          <input
            className="w-full border rounded-md px-3 py-2 text-sm"
            value={s["notifications.reminderOverdueAfterDays"] ?? "3"}
            onChange={(e) => setS({ ...s, ["notifications.reminderOverdueAfterDays"]: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {textarea(
          "notifications.template.paymentReminder",
          "Payment Reminder Template",
          "Use placeholders: {{driverName}}, {{amount}}, {{dueDate}}"
        )}
        {textarea(
          "notifications.template.overdueNotice",
          "Overdue Notice Template",
          "Use placeholders: {{driverName}}, {{amount}}, {{dueDate}}"
        )}
        {textarea("notifications.template.docApproved", "Document Approved Template")}
        {textarea(
          "notifications.template.docRejected",
          "Document Rejected Template",
          "Use placeholder: {{reason}}"
        )}
      </div>
    </div>
  );
}
```

---

## 8.4 Contracts Page (car/bike default pricing + terms)

Create:

* `app/admin/settings/contracts/page.tsx`
* `app/admin/settings/contracts/contracts-client.tsx`

(Use the same patterns — I kept it short here; if you want I’ll paste these 2 files next exactly like above.)

---

## 8.5 Onboarding Page (required fields/docs + progress weights)

Create:

* `app/admin/settings/onboarding/page.tsx`
* `app/admin/settings/onboarding/onboarding-client.tsx`

(Also same pattern — saves JSON strings for arrays/weights.)

---

## 8.6 System Page (maintenance mode + exports later)

Create:

* `app/admin/settings/system/page.tsx`
* `app/admin/settings/system/system-client.tsx`

---

## 8.7 Admin Accounts Page (simple)

If you already have admin creation solved via seed, keep this **read-only** for now, or implement later.

Minimum page can just list admin users.

---

# 9) Add “Settings” link in Admin nav

Where your admin nav items are (the top menu in your screenshot), add:

* **Settings** → `/admin/settings/company`

---

# 10) Verification checklist

After implementing above:

✅ Visit: `/admin/settings/company`

* Change company name → Save → refresh → value persists

✅ Visit: `/admin/settings/payments`

* Switch to MANUAL mode
* Set grace days

✅ Visit: `/admin/settings/notifications`

* Shows Resend status configured/missing depending on `.env.local`

---

# 11) What this unlocks next (your Payments page problem)

Once settings exist, we connect your payments logic to:

* `payments.mode` (MANUAL/STRIPE)
* reminder rules from Notifications settings
* default amounts per car/bike from Contracts settings
* onboarding requirements from Onboarding settings (progress bar accuracy)

So even with **no Stripe**, your system becomes usable:

* Contracts create payments
* Admin marks paid manually
* Driver dashboard shows due/overdue

---

## Do this now

Reply with your project root structure (just tell me if your Prisma client is at `@/lib/prisma` and auth is `@/auth`), and I’ll paste the remaining **Contracts / Onboarding / System** page files in the exact same style so you can copy-paste without guessing.
