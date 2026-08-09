"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { CheckIcon } from "@/components/icons";
import { Button, ErrorNote, Panel } from "@/components/ui";
import { savePaymentSettings } from "../actions";

type Values = {
  qr_url: string | null;
  upi_id: string;
  payee_name: string;
  payment_note: string;
};

export function PaymentForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await savePaymentSettings(values);
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
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Panel title="QR code">
        <ImageUpload
          bucket="payment-qr"
          value={values.qr_url}
          onChange={(url) => set("qr_url", url)}
        />
        {!values.qr_url && (
          <p className="mt-3 rounded-lg bg-warn-500/10 px-3 py-2 text-[11px] text-warn-400">
            Checkout is blocked while this is empty.
          </p>
        )}
      </Panel>

      <Panel title="Payment details">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Payee name</span>
            <input
              value={values.payee_name}
              onChange={(e) => set("payee_name", e.target.value)}
              placeholder="Business name"
              className="field"
            />
          </label>
          <label className="block">
            <span className="label">UPI ID</span>
            <input
              value={values.upi_id}
              onChange={(e) => set("upi_id", e.target.value)}
              placeholder="name@bank"
              className="field"
            />
          </label>
        </div>

        <label className="mt-3.5 block">
          <span className="label">Instructions shown at checkout</span>
          <textarea
            rows={4}
            value={values.payment_note}
            onChange={(e) => set("payment_note", e.target.value)}
            className="field"
          />
        </label>

        {error && (
          <div className="mt-3.5">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save payment settings"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-ok-400">
              <CheckIcon className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </Panel>
    </form>
  );
}
