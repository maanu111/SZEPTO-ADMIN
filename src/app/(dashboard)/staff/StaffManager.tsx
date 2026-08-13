"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { Button, EmptyState, ErrorNote, Panel, Pill } from "@/components/ui";
import { ADMIN_PAGES } from "@/lib/access";
import { createStaff, deleteStaff, resetStaffPassword, updateStaff } from "./actions";

type Row = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  allowed_pages: string[];
  created_at: string;
};

const BLANK = { full_name: "", email: "", password: "", phone: "" };

export function StaffManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const staff = rows.filter((r) => r.role !== "owner");
  const owner = rows.find((r) => r.role === "owner");

  return (
    <div className="flex flex-col gap-3">
      <Panel
        title={`Team (${staff.length})`}
        action={
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <PlusIcon className="h-3.5 w-3.5" />
            Add staff
          </Button>
        }
        padded={false}
      >
        {owner && (
          <div className="flex items-center gap-3 border-b border-line-soft px-3 py-2.5">
            <Avatar name={owner.full_name || "Owner"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-text-hi">
                {owner.full_name || "Owner"}
              </p>
              <p className="truncate text-[11px] text-text-dim">{owner.email}</p>
            </div>
            <Pill tone="accent">Owner · all pages</Pill>
          </div>
        )}

        {staff.length === 0 ? (
          <EmptyState
            title="No staff yet"
            hint="Add someone and choose which pages they can open."
          />
        ) : (
          <ul className="flex flex-col">
            {staff.map((s) => (
              <li key={s.id}>
                {/* The whole row opens the editor — no separate edit button. */}
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  className="flex w-full items-center gap-3 border-b border-line-soft px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-shell-850"
                >
                  <Avatar name={s.full_name} muted={!s.is_active} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[12px] font-medium ${
                        s.is_active ? "text-text-hi" : "text-text-faint line-through"
                      }`}
                    >
                      {s.full_name}
                    </p>
                    <p className="truncate text-[11px] text-text-dim">
                      {s.email}
                      {s.phone && ` · ${s.phone}`}
                    </p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 sm:flex">
                    {s.allowed_pages.length === 0 ? (
                      <Pill tone="bad">No pages</Pill>
                    ) : (
                      <Pill>{s.allowed_pages.length} pages</Pill>
                    )}
                  </span>
                  {!s.is_active && <Pill tone="bad">Off</Pill>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {creating && (
        <CreateSheet
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <EditSheet
          row={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Avatar({ name, muted = false }: { name: string; muted?: boolean }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
        muted ? "bg-shell-850 text-text-faint" : "bg-shell-800 text-text-hi"
      }`}
    >
      {initial}
    </span>
  );
}

/* ------------------------------------------------------------------ sheet */

function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 sm:items-center sm:justify-center sm:p-4">
      {/* Header / scrolling body / pinned footer, so Save stays reachable on a phone. */}
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-shell-900 sm:max-w-lg sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <h2 className="truncate text-[13px] font-semibold text-text-hi">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-dim transition-colors hover:text-text-hi"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3.5">{children}</div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-line-soft px-4 py-3">
          {footer}
        </footer>
      </div>
    </div>
  );
}

function PagePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">Pages this person can open</span>
        <button
          type="button"
          onClick={() => onChange(value.length === ADMIN_PAGES.length ? [] : ADMIN_PAGES.map((p) => p.key))}
          className="text-[11px] font-medium text-text-dim transition-colors hover:text-text-hi"
        >
          {value.length === ADMIN_PAGES.length ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {ADMIN_PAGES.map((p) => {
          const on = value.includes(p.key);
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p.key)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-colors ${
                on
                  ? "border-ok-500/40 bg-ok-500/10 text-ok-400"
                  : "border-line text-text-dim hover:border-shell-700 hover:text-text-hi"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                  on ? "border-ok-500 bg-ok-500 text-white" : "border-shell-700"
                }`}
              >
                {on && <CheckIcon className="h-2.5 w-2.5" strokeWidth={3.5} />}
              </span>
              <span className="truncate">{p.label}</span>
            </button>
          );
        })}
      </div>
      {value.length === 0 && (
        <p className="mt-1.5 text-[11px] text-warn-400">
          With nothing ticked they can sign in but see nothing.
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- create */

function CreateSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState(BLANK);
  const [pages, setPages] = useState<string[]>(["orders"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createStaff({ ...form, allowed_pages: pages });
      if (!result.ok) setError(result.error);
      else onDone();
    });
  };

  const set = (k: keyof typeof BLANK, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Sheet
      title="Add staff"
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" disabled={pending} onClick={submit}>
            {pending ? "Creating…" : "Create account"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name</span>
          <input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Full name"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">Phone</span>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="9876543210"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="name@example.com"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input
            type="text"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="At least 8 characters"
            className="field"
          />
        </label>
      </div>

      <p className="mt-1.5 text-[11px] text-text-faint">
        They sign in at this same address with the email and password you set here.
      </p>

      <div className="mt-4">
        <PagePicker value={pages} onChange={setPages} />
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------- edit */

function EditSheet({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(row.full_name);
  const [phone, setPhone] = useState(row.phone);
  const [pages, setPages] = useState<string[]>(row.allowed_pages);
  const [active, setActive] = useState(row.is_active);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateStaff(row.id, {
        full_name: name,
        phone,
        allowed_pages: pages,
        is_active: active,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (newPassword) {
        const pw = await resetStaffPassword(row.id, newPassword);
        if (!pw.ok) {
          setError(pw.error);
          return;
        }
      }
      onDone();
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteStaff(row.id);
      if (!result.ok) setError(result.error);
      else onDone();
    });
  };

  return (
    <Sheet
      title={row.full_name || row.email}
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <span className="ml-auto">
            {confirmDelete ? (
              <span className="flex items-center gap-1.5">
                <Button variant="danger" size="sm" disabled={pending} onClick={remove}>
                  Really remove
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </span>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                Remove
              </Button>
            )}
          </span>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
        </label>
        <label className="block">
          <span className="label">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input value={row.email} readOnly disabled className="field" />
        </label>
        <label className="block">
          <span className="label">New password</span>
          <input
            type="text"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep"
            className="field"
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-3.5 w-3.5 accent-ok-500"
        />
        <span className="text-[12px] text-text">
          Account active
          <span className="ml-1.5 text-[11px] text-text-faint">
            switching this off blocks sign-in without deleting anything
          </span>
        </span>
      </label>

      <div className="mt-4">
        <PagePicker value={pages} onChange={setPages} />
      </div>

      {note && <p className="mt-3 text-[12px] text-ok-400">{note}</p>}
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <button type="button" className="hidden" onClick={() => setNote(null)} />
    </Sheet>
  );
}
