"use client";

import { useEffect, useMemo, useState } from "react";

export function useSettingsForm(keys: string[]) {
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    keys.forEach((k) => params.append("key", k));

    const res = await fetch(`/api/admin/settings?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();

    const data = json?.data ?? {};
    setInitial(data);
    setForm(data);
    setLastUpdatedAt(json?.lastUpdatedAt ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join("|")]);

  const dirty = useMemo(() => {
    const allKeys = new Set([...Object.keys(initial), ...Object.keys(form)]);
    for (const k of allKeys) {
      if ((initial[k] ?? "") !== (form[k] ?? "")) return true;
    }
    return false;
  }, [initial, form]);

  async function save() {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: form }),
    });

    if (!res.ok) throw new Error("Save failed");
    await load(); // Refetch after save
    setEdit(false);
  }

  function cancel() {
    setForm(initial);
    setEdit(false);
  }

  function toggleEdit() {
    setEdit(true);
  }

  return {
    loading,
    edit,
    dirty,
    initial,
    form,
    setForm,
    save,
    cancel,
    toggleEdit,
    lastUpdatedAt,
    reload: load,
  };
}

