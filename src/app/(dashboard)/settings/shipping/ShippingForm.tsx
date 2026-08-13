"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import { Button, ErrorNote, Panel, inr } from "@/components/ui";
import { saveShippingSettings } from "../actions";

type Values = {
  rate_per_kg: number;
  service_charge: number;
  free_shipping_over: number;
  volumetric_divisor: number;
  delivery_estimate: string;
  whatsapp_number: string;
  whatsapp_message: string;
};

/** Sample consignments so the admin sees the effect of a change immediately. */
const PREVIEW_WEIGHTS = [0.5, 2, 3.5, 10];

/** A carton the customer might order: big, light, and billed on its size. */
const PREVIEW_BOX = { l: 40, w: 30, h: 25, actualKg: 1.2 };

export function ShippingForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const setNum = (key: keyof Values, raw: string) =>
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

  const divisor = values.volumetric_divisor || 5000;
  const boxVolumetric = (PREVIEW_BOX.l * PREVIEW_BOX.w * PREVIEW_BOX.h) / divisor;
  const boxBilled = Math.max(boxVolumetric, PREVIEW_BOX.actualKg);

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-4">
        <Panel title="Charges">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="label">Shipping rate per kg (₹)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={values.rate_per_kg}
                onChange={(e) => setNum("rate_per_kg", e.target.value)}
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
                onChange={(e) => setNum("service_charge", e.target.value)}
                className="field tnum"
              />
            </label>

            <label className="block">
              <span className="label">Free shipping above (₹)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={values.free_shipping_over}
                onChange={(e) => setNum("free_shipping_over", e.target.value)}
                className="field tnum"
              />
            </label>

            <label className="block">
              <span className="label">Delivery estimate</span>
              <input
                type="text"
                value={values.delivery_estimate}
                onChange={(e) =>
                  setValues((v) => ({ ...v, delivery_estimate: e.target.value }))
                }
                placeholder="7-10 days"
                className="field"
              />
            </label>
          </div>
        </Panel>

        <Panel title="WhatsApp support">
          <p className="mb-3 text-[12px] leading-relaxed text-text-dim">
            Shows a WhatsApp button on the storefront. Leave the number blank to hide it.
          </p>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="label">WhatsApp number</span>
              <input
                type="text"
                value={values.whatsapp_number}
                onChange={(e) =>
                  setValues((v) => ({ ...v, whatsapp_number: e.target.value }))
                }
                placeholder="919876543210"
                className="field tnum"
              />
              <span className="mt-1 block text-[11px] text-text-faint">
                With country code, digits only.
              </span>
            </label>
            <label className="block">
              <span className="label">First message</span>
              <input
                type="text"
                value={values.whatsapp_message}
                onChange={(e) =>
                  setValues((v) => ({ ...v, whatsapp_message: e.target.value }))
                }
                placeholder="Hi! I need help with my order."
                className="field"
              />
              <span className="mt-1 block text-[11px] text-text-faint">
                Pre-filled in the customer&apos;s chat.
              </span>
            </label>
          </div>
        </Panel>

        <Panel title="Oversized items">
          <p className="mb-3 text-[12px] leading-relaxed text-text-dim">
            A large but light carton takes up space a heavier parcel would have paid for, so
            carriers bill whichever is greater: what it weighs, or{" "}
            <span className="font-semibold text-text-hi">length × width × height ÷ divisor</span>.
            Set each product&apos;s carton size on its variants; anything left blank is billed on
            weight alone.
          </p>

          <label className="block sm:max-w-[calc(50%-0.4375rem)]">
            <span className="label">Volumetric divisor</span>
            <input
              type="number"
              min={1}
              step={1}
              value={values.volumetric_divisor}
              onChange={(e) => setNum("volumetric_divisor", e.target.value)}
              className="field tnum"
            />
          </label>
          <p className="mt-1.5 text-[11px] text-text-faint">
            5000 is the usual air-freight figure. 4000 charges more for the same box.
          </p>

          {error && (
            <div className="mt-3.5">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-[12px] font-semibold text-ok-400">
                <CheckIcon className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
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

        <Panel title="Big empty box">
          <p className="text-[12px] text-text-dim">
            A {PREVIEW_BOX.l}×{PREVIEW_BOX.w}×{PREVIEW_BOX.h} cm carton weighing only{" "}
            <span className="tnum font-semibold text-text-hi">{PREVIEW_BOX.actualKg} kg</span>:
          </p>
          <ul className="mt-2.5 flex flex-col divide-y divide-line-soft">
            <li className="flex items-center justify-between py-2 text-[12px]">
              <span className="text-text-dim">Actual weight</span>
              <span className="tnum text-text">{PREVIEW_BOX.actualKg} kg</span>
            </li>
            <li className="flex items-center justify-between py-2 text-[12px]">
              <span className="text-text-dim">Volumetric ÷ {divisor}</span>
              <span className="tnum text-text">{boxVolumetric.toFixed(2)} kg</span>
            </li>
            <li className="flex items-center justify-between py-2 text-[12px]">
              <span className="font-semibold text-text-hi">Billed at</span>
              <span className="tnum font-semibold text-accent-400">
                {boxBilled.toFixed(2)} kg &middot; {inr(Math.round(boxBilled * values.rate_per_kg))}
              </span>
            </li>
          </ul>
        </Panel>
      </div>
    </form>
  );
}
