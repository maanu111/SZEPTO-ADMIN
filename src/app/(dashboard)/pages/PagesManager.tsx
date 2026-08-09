"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronRight, CloseIcon } from "@/components/icons";
import { Button, ErrorNote, Panel, Pill } from "@/components/ui";
import { savePage, type PageInput } from "./actions";

export type PageRecord = PageInput & { id: string };

/**
 * Footer pages are a fixed set — the admin edits their content, but doesn't add
 * or remove them, so the footer layout stays predictable.
 *
 * On narrow screens the editor opens as an overlay; stacking it under a long list
 * meant tapping Edit appeared to do nothing.
 */
export function PagesManager({ pages }: { pages: PageRecord[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PageRecord | null>(null);
  const [values, setValues] = useState<PageInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLFormElement>(null);

  const groups = Array.from(new Set(pages.map((p) => p.group_name)));

  // Lock the page behind the overlay on small screens.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEditing(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing]);

  const openEdit = (p: PageRecord) => {
    setValues({
      slug: p.slug,
      title: p.title,
      group_name: p.group_name,
      body: p.body,
      sort_order: p.sort_order,
      is_active: p.is_active,
    });
    setEditing(p);
    setError(null);
    setSaved(false);
    // On xl the editor is already on screen; below that it is an overlay.
    requestAnimationFrame(() => panelRef.current?.scrollTo({ top: 0 }));
  };

  const set = <K extends keyof PageInput>(key: K, value: PageInput[K]) =>
    setValues((v) => (v ? { ...v, [key]: value } : v));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !values) return;
    setError(null);

    startTransition(async () => {
      const result = await savePage(editing.id, values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setEditing(null);
      }, 900);
      router.refresh();
    });
  };

  /**
   * The form is split into a scrolling body and a pinned action row so the
   * Save button can never be pushed off a short screen by long content.
   */
  const editorBody =
    editing && values ? (
      <>
        <label className="block">
          <span className="label">Title</span>
          <input
            required
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Page title"
            className="field"
          />
        </label>

        <label className="mt-3 flex min-h-0 flex-1 flex-col">
          <span className="label">Content</span>
          <textarea
            value={values.body}
            onChange={(e) => set("body", e.target.value)}
            placeholder="Blank line starts a new paragraph"
            className="field min-h-[9rem] flex-1 resize-none font-mono text-[12px] xl:min-h-[20rem]"
          />
        </label>

        <label className="mt-3 flex shrink-0 cursor-pointer items-center gap-2 text-[12px] text-text-dim">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="accent-[#10b981]"
          />
          Show in footer
        </label>

        {error && (
          <div className="mt-3 shrink-0">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
      </>
    ) : null;

  const editorActions = (
    <div className="flex items-center gap-2">
      <Button type="submit" variant="primary" disabled={pending} className="flex-1">
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" onClick={() => setEditing(null)} disabled={pending}>
        Cancel
      </Button>
      {saved && <CheckIcon className="h-4 w-4 shrink-0 text-ok-400" />}
    </div>
  );

  /** Desktop: everything in one scrolling panel. */
  const inlineEditor = editorBody ? (
    <form onSubmit={submit} className="flex flex-col">
      {editorBody}
      <div className="mt-4">{editorActions}</div>
    </form>
  ) : (
    <p className="text-[12px] text-text-dim">Select a page to edit its content.</p>
  );

  return (
    <>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {groups.map((group) => (
            <Panel key={group} title={group} padded={false}>
              <ul className="divide-y divide-line-soft">
                {pages
                  .filter((p) => p.group_name === group)
                  .map((p) => {
                    const open = editing?.id === p.id;
                    return (
                      <li key={p.id}>
                        {/* The whole row is the control — no separate Edit button */}
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          aria-current={open ? "true" : undefined}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            open ? "bg-shell-850" : "hover:bg-shell-850"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[12px] font-medium text-text-hi">
                                {p.title}
                              </span>
                              {!p.is_active && <Pill tone="bad">Hidden</Pill>}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-text-faint">
                              {p.body.split("\n")[0]}
                            </span>
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-faint" />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </Panel>
          ))}
        </div>

        {/* Inline editor — xl and up only */}
        <div className="hidden xl:block">
          <Panel title={editing ? editing.title : "Editor"}>{inlineEditor}</Panel>
        </div>
      </div>

      {/*
        Overlay editor — below xl.
        The sheet is a fixed-height flex column: header and actions never move,
        only the middle scrolls. Without this the long textarea pushed Save
        below the fold on short screens.
      */}
      {editing && values && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 xl:hidden">
          <button
            type="button"
            className="min-h-[12vh] flex-1"
            onClick={() => setEditing(null)}
            aria-label="Close editor"
          />

          <form
            onSubmit={submit}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${editing.title}`}
            className="flex max-h-[85dvh] min-h-0 flex-col rounded-t-2xl border-t border-line bg-shell-900"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
              <h2 className="truncate text-[13px] font-semibold text-text-hi">{editing.title}</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-dim hover:bg-shell-850 hover:text-text-hi"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </header>

            <div className="thin-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              {editorBody}
            </div>

            {/* Pinned so Save is reachable regardless of content length */}
            <footer className="shrink-0 border-t border-line-soft px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {editorActions}
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
