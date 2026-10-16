"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { dictionary, t, type Locale } from "@/i18n";

const STORAGE_KEY = "owr.savedFilters.v1";

interface Preset {
  name: string;
  query: string;
}

export function SavedFilters({ locale, currentQuery }: { locale: Locale; currentQuery: string }) {
  const dict = dictionary(locale);
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setPresets(stored ? (JSON.parse(stored) as Preset[]) : []);
    } catch {
      setPresets([]);
    }
  }, []);

  function save() {
    const name = window.prompt(t(dict, "common.savedFilters"));
    if (!name) return;
    const next = [...presets, { name, query: currentQuery }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPresets(next);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={save}
        className="flex h-11 items-center gap-1.5 rounded-md border border-border bg-raised px-3 text-muted hover:text-accent"
      >
        <Bookmark size={13} aria-hidden="true" />
        {t(dict, "common.savedFilters")}
      </button>
      {presets.map((preset) => (
        <a
          key={preset.name}
          href={`?${preset.query}`}
          className="rounded-md border border-border px-3 py-1.5 text-muted hover:text-text hover:border-accent/40"
        >
          {preset.name}
        </a>
      ))}
    </div>
  );
}
