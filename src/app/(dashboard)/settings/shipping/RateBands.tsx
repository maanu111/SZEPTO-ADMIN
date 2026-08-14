"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { Button, ErrorNote, Panel, inr } from "@/components/ui";
import { saveShippingRates } from "../actions";

export type Band = {
  id: string;
  min_kg: number;
  max_kg: number | null;
  price: number;
};

/**
 * Weight bands: one price for the whole consignment, chosen by its total weight.
 *
 * Bands are half-open — above the minimum, up to and including the maximum —
 * so consecutive bands share an edge and a fractional weight can never fall
 * between two of them. The editor keeps each band's floor pinned to the one
 * below so that stays true no matter what gets typed.
 */
export function RateBands({ initial }: { initial: Band[] }) {
  const router = useRouter();
  const [bands, setBands] = useState<Band[]>(
    initial.length
      ? initial
      : [{ id: crypto.randomUUID(), min_kg: 0, max_kg: 10, price: 300 }]
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  /** Each band starts where the previous one ended; only ceilings are editable. */
  const normalise = (list: Band[]): Band[] =>
    list.map((b, i) => ({ ...b, min_kg: i === 0 ? 0 : (list[i - 1].max_kg ?? 0) }));

  const setCeiling = (id: string, raw: string) => {
    const value = raw.trim() === "" ? null : Math.max(0, Number(raw) || 0);
    setBands((list) => normalise(list.map((b) => (b.id === id ? { ...b, max_kg: value } : b))));
  };

  const setPrice = (id: string, raw: string) =>
    setBands((list) =>
      list.map((b) => (b.id === id ? { ...b, price: Math.max(0, Math.round(Number(raw) || 0)) } : b))
    );

  const addBand = () =>
    setBands((list) => {
      const last = list.at(-1);
      const floor = last?.max_kg ?? 0;
      return normalise([
        ...list,
        { id: crypto.randomUUID(), min_kg: floor, max_kg: floor + 10, price: 0 },
      ]);
    });

  const removeBand = (id: string) =>
    setBands((list) => normalise(list.filter((b) => b.id !== id)));

  const save = () => {
    setError(null);
    setSaved(false);

    // Every band except the last must have a ceiling, or the ones after it are
    // unreachable.
    const openEarly = bands.findIndex((b, i) => b.max_kg === null && i < bands.length - 1);
    if (openEarly !== -1) {
      setError("Only the last band can be left open-ended.");
      return;
    }
    if (bands.some((b) => b.max_kg !== null && b.max_kg <= b.min_kg)) {
      setError("Each band must end above where it starts.");
      return;
    }

    startTransition(async () => {
      const result = await saveShippingRates(
        bands.map((b, i) => ({
          min_kg: b.min_kg,
          max_kg: b.max_kg,
          price: b.price,
          sort_order: i,
        }))
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });
  };

  const label = (b: Band) =>
    b.max_kg === null
      ? `Over ${b.min_kg} kg`
      : b.min_kg <= 0
        ? `Up to ${b.max_kg} kg`
        : `${b.min_kg}–${b.max_kg} kg`;

  const lastCeiling = bands.at(-1)?.max_kg;

  return (
    <Panel
      title="Shipping by weight"
      action={
        <Button variant="secondary" size="sm" onClick={addBand}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add band
        </Button>
      }
    >
      <p className="mb-3 text-[12px] leading-relaxed text-text-dim">
        Set what delivery costs for each weight range. The customer pays one price for the whole
        order, based on how much it all weighs together. Leave the last row&apos;s limit empty so it
        covers everything heavier.
      </p>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_5.5rem_6rem_2rem] gap-2 px-0.5">
          <span className="label mb-0">Weight range</span>
          <span className="label mb-0">Up to (kg)</span>
          <span className="label mb-0">Price (₹)</span>
          <span />
        </div>

        {bands.map((b) => (
          <div key={b.id} className="grid grid-cols-[1fr_5.5rem_6rem_2rem] items-center gap-2">
            <span className="truncate text-[12px] font-medium text-text-hi">{label(b)}</span>
            <input
              type="number"
              min={0}
              step="0.5"
              value={b.max_kg ?? ""}
              onChange={(e) => setCeiling(b.id, e.target.value)}
              placeholder="∞"
              className="field tnum"
            />
            <input
              type="number"
              min={0}
              step={1}
              value={b.price}
              onChange={(e) => setPrice(b.id, e.target.value)}
              className="field tnum"
            />
            <button
              type="button"
              onClick={() => removeBand(b.id)}
              disabled={bands.length === 1}
              aria-label={`Remove ${label(b)}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-faint transition-colors hover:text-bad-400 disabled:opacity-30"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {lastCeiling !== null && lastCeiling !== undefined && (
        <p className="mt-2.5 text-[11px] text-warn-400">
          Orders heavier than {lastCeiling} kg will be charged the last row&apos;s price. Clear the
          last limit to make that row cover everything heavier.
        </p>
      )}

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button variant="primary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save bands"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-[12px] font-semibold text-ok-400">
            <CheckIcon className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>

      {/* What a few sample orders would actually be charged. */}
      <div className="mt-4 border-t border-line-soft pt-3">
        <span className="label">What customers would pay</span>
        <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          {[3.5, 12, 25, 45].map((kg) => {
            const hit = bands.find(
              (b) => kg > b.min_kg && (b.max_kg === null || kg <= b.max_kg)
            );
            return (
              <li key={kg} className="text-[11px] text-text-dim">
                <span className="tnum font-medium text-text-hi">{kg} kg</span>{" "}
                {hit ? (
                  <span className="tnum text-accent-400">{inr(hit.price)}</span>
                ) : (
                  <span className="text-warn-400">last row&apos;s price</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
