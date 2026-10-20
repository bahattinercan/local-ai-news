"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bookmark, Trash2, X } from "lucide-react";
import { dictionary, t, type Dictionary, type Locale } from "@/i18n";

const STORAGE_KEY = "owr.savedFilters.v1";

/* `page` is not part of a filter: keeping it made a preset reopen on page 4 of
   a result set it was not saved from. */
const DROPPED_PARAMS = new Set(["page"]);

interface Preset {
  name: string;
  query: string;
}

/* The filter row's own words, so a preset reads as "Pencere: 30d · Runner:
   llama.cpp" instead of as a query string. Keys the row does not label (a
   hand-edited param) fall back to the raw name. */
const LABEL_KEYS: Record<string, string> = {
  window: "filters.window",
  sort: "filters.sort",
  gate: "filters.gate",
  runner: "filters.runner",
  maxParams: "filters.size",
  license: "filters.license",
  q: "filters.search"
};

function describe(query: string, dict: Dictionary): string {
  const parts: string[] = [];
  for (const [key, value] of new URLSearchParams(query)) {
    if (value === "") continue;
    parts.push(`${t(dict, LABEL_KEYS[key] ?? key)}: ${value}`);
  }
  return parts.length > 0 ? parts.join(" · ") : t(dict, "common.defaults");
}

export function SavedFilters({ locale, currentQuery }: { locale: Locale; currentQuery: string }) {
  const dict = dictionary(locale);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  /* The modal is portalled to `body` so it belongs to the top layer rather than
     to the row it was opened from: inside the filters disclosure, `showModal()`
     while that disclosure was closed produced an open, `:modal`, invisible
     dialog whose backdrop still swallowed every click. */
  const [mounted, setMounted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setPresets(stored ? (JSON.parse(stored) as Preset[]) : []);
    } catch {
      setPresets([]);
    }
  }, []);

  /* `showModal()` is the only way to get the top layer, the backdrop and the
     focus trap for free. The state stays the single source of truth: Esc fires
     `close`, which flips it back, so the button and the ✕ cannot disagree. */
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  function persist(next: Preset[]) {
    setPresets(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Private mode or a full quota: the list still works for this page view. */
    }
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const query = new URLSearchParams([...new URLSearchParams(currentQuery)].filter(([key]) => !DROPPED_PARAMS.has(key))).toString();
    /* Same name = same filter: overwrite instead of piling up two "Kısa GGUF"
       rows the user then has to tell apart. */
    const at = presets.findIndex((preset) => preset.name === trimmed);
    const next =
      at === -1
        ? [...presets, { name: trimmed, query }]
        : presets.map((preset, index) => (index === at ? { name: trimmed, query } : preset));
    persist(next);
    setNotice(t(dict, at === -1 ? "common.saved" : "common.savedReplaced"));
    setName("");
  }

  function remove(target: string) {
    persist(presets.filter((preset) => preset.name !== target));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNotice("");
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className="inline-flex h-11 shrink-0 items-center gap-1.5 border border-rule px-3 text-muted hover:border-rule-strong hover:text-text"
      >
        <Bookmark size={13} aria-hidden="true" />
        {t(dict, "common.savedFilters")}
        {presets.length > 0 ? <span className="font-mono text-xs text-accent">{presets.length}</span> : null}
      </button>

      {mounted
        ? createPortal(
            <dialog
              ref={dialog}
              onClose={() => setOpen(false)}
              /* A modal dialog's backdrop is a click on the dialog element itself. */
              onClick={(event) => {
                if (event.target === dialog.current) setOpen(false);
              }}
              aria-labelledby="saved-filters-title"
              className="m-auto w-[min(34rem,calc(100vw-2rem))] border border-rule-strong bg-surface p-0 text-sm text-text shadow-[var(--shadow-lift)] backdrop:bg-black/50"
            >
              <div className="flex items-center justify-between gap-3 border-b border-rule px-3 py-2">
                <h2 id="saved-filters-title" className="label text-muted">
                  {t(dict, "common.savedFilters")}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t(dict, "common.close")}
                  className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-text"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>

              <div className="px-3 py-3">
                <p className="text-xs text-muted">{t(dict, "common.savedFiltersHint")}</p>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[180px] flex-1 flex-col gap-1">
                    <span className="label text-muted">{t(dict, "common.filterName")}</span>
                    <input
                      /* Deliberately no `name`: the modal sits in the document,
                         and a named input would ride along on Apply. */
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          save();
                        }
                      }}
                      className="h-11 w-full border border-control bg-surface px-2.5 text-sm text-text"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={save}
                    disabled={name.trim() === ""}
                    className="h-11 shrink-0 border border-transparent bg-accent px-3.5 text-sm font-medium text-bg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t(dict, "common.save")}
                  </button>
                </div>

                {notice ? <p className="mt-2 text-xs text-ok">{notice}</p> : null}

                <ul className="mt-3 max-h-64 divide-y divide-rule overflow-y-auto border-t border-rule">
                  {presets.length === 0 ? (
                    <li className="py-3 text-muted">{t(dict, "common.noSavedFilters")}</li>
                  ) : (
                    presets.map((preset, index) => (
                      <li key={`${preset.name}-${index}`} className="flex items-center gap-2 py-1.5">
                        <Link href={`?${preset.query}`} onClick={() => setOpen(false)} className="min-w-0 flex-1 py-1 hover:text-accent">
                          <span className="block truncate">{preset.name}</span>
                          <span className="block truncate font-mono text-xs text-muted">{describe(preset.query, dict)}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(preset.name)}
                          aria-label={`${t(dict, "common.delete")}: ${preset.name}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-rule text-muted hover:border-danger hover:text-danger"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </dialog>,
            document.body
          )
        : null}
    </>
  );
}
