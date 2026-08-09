"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { Button, ErrorNote, Panel, inr } from "@/components/ui";
import { saveShippingSettings } from "../actions";

type Values = { rate_per_kg: number; service_charge: number; free_shipping_over: number };

/** Sample weights so the admin can see the effect of a rate change immediately. */
const PREVIEW_WEIGHTS = [0.5, 2, 3.5, 10];

export function ShippingForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof Values, raw: string) =>
    setValues((v) => ({ ...v, [key]: Math.max(0, Math.round(Number(raw) || 0)) }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveShippingSettings(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title="Charges">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Shipping rate per kg (₹)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={values.rate_per_kg}
              onChange={(e) => set("rate_per_kg", e.target.value)}
              className="field tnum"
            />
          </label>

          <label className="block">
            <span className="label">Service charge (₹)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={values.service_charge}
              onChange={(e) => set("service_charge", e.target.value)}
              className="field tnum"
            />
          </label>
        </div>

        <label className="mt-3.5 block sm:max-w-[calc(50%-0.4375rem)]">
          <span className="label">Free shipping above (₹)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={values.free_shipping_over}
            onChange={(e) => set("free_shipping_over", e.target.value)}
            className="field tnum"
          />
        </label>

        {error && (
          <div className="mt-3.5">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save charges"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-ok-400">
              <CheckIcon className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </Panel>

      <Panel title="Preview">
        <ul className="flex flex-col divide-y divide-line-soft">
          {PREVIEW_WEIGHTS.map((kg) => {
            const shipping = Math.round(kg * values.rate_per_kg);
            return (
              <li key={kg} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[12px] text-text-dim">
                  <span className="tnum font-semibold text-text-hi">{kg} kg</span> consignment
                </span>
                <span className="text-right">
                  <span className="tnum block text-[13px] font-semibold text-text-hi">
                    {inr(shipping + values.service_charge)}
                  </span>
                  <span className="tnum block text-[10px] text-text-faint">
                    {inr(shipping)} + {inr(values.service_charge)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </form>
  );
}
