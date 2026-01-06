import Link from "next/link";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="rounded-md border p-6 text-center">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
      <Link
        href={actionHref}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

