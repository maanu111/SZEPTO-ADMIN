"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { Button, ErrorNote } from "@/components/ui";
import type { OrderStatus } from "@/lib/database.types";
import { saveAdminNote, setOrderStatus } from "./actions";

/**
 * The order lifecycle, as the admin drives it.
 *
 * Each state knows the one action that moves it forward and the one that walks
 * it back, so the panel only ever shows the moves that make sense right now
 * rather than a row of buttons that are mostly wrong.
 */
const FLOW: Record<
  OrderStatus,
  {
    /** The single button that advances the order. */
    next?: { status: OrderStatus; label: string };
    /** Undo, for a misclick. */
    back?: { status: OrderStatus; label: string };
    /** Whether rejecting is still on the table. */
    canReject: boolean;
    hint: string;
  }
> = {
  pending: {
    next: { status: "confirmed", label: "Confirm payment" },
    canReject: true,
    hint: "Check the payment proof, then confirm.",
  },
  confirmed: {
    next: { status: "shipped", label: "Mark shipped" },
    back: { status: "pending", label: "Back to pending" },
    canReject: true,
    hint: "Payment verified. Mark shipped once it leaves the store.",
  },
  shipped: {
    next: { status: "delivered", label: "Mark delivered" },
    back: { status: "confirmed", label: "Back to confirmed" },
    canReject: false,
    hint: "On the way. Mark delivered once the customer has it.",
  },
  delivered: {
    back: { status: "shipped", label: "Back to shipped" },
    canReject: false,
    hint: "Order complete.",
  },
  cancelled: {
    back: { status: "pending", label: "Reopen as pending" },
    canReject: false,
    hint: "This order was cancelled.",
  },
};

export function OrderActions({
  id,
  status,
  adminNote,
}: {
  id: string;
  status: OrderStatus;
  adminNote: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(adminNote);
  const [noteSaved, setNoteSaved] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const flow = FLOW[status] ?? FLOW.pending;

  const run = (next: OrderStatus) => {
    setError(null);
    startTransition(async () => {
      const result = await setOrderStatus(id, next, note);
      if (!result.ok) setError(result.error);
      else router.refresh();
      setConfirmingCancel(false);
    });
  };

  const persistNote = () => {
    setError(null);
    setNoteSaved(false);
    startTransition(async () => {
      const result = await saveAdminNote(id, note);
      if (!result.ok) setError(result.error);
      else {
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 2000);
      }
    });
  };

  return (
    <div>
      <p className="mb-2.5 text-[11px] leading-relaxed text-fg-dim">{flow.hint}</p>

      <div className="flex flex-col gap-2">
        {flow.next && (
          <Button
            variant="ok"
            size="lg"
            disabled={pending}
            onClick={() => run(flow.next!.status)}
            className="w-full"
          >
            <CheckIcon className="h-4 w-4" />
            {pending ? "Working…" : flow.next.label}
          </Button>
        )}

        {flow.canReject &&
          (confirmingCancel ? (
            <div className="rounded-lg border border-bad-500/30 bg-bad-500/10 p-3">
              <p className="text-[12px] font-semibold text-bad-400">Reject this order?</p>
              <div className="mt-2.5 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pending}
                  onClick={() => run("cancelled")}
                  className="flex-1"
                >
                  Yes, reject
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingCancel(false)}
                  className="flex-1"
                >
                  Keep
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="danger"
              size="lg"
              disabled={pending}
              onClick={() => setConfirmingCancel(true)}
              className="w-full"
            >
              <CloseIcon className="h-4 w-4" />
              Reject order
            </Button>
          ))}

        {flow.back && (
          <Button
            variant="secondary"
            size="md"
            disabled={pending}
            onClick={() => run(flow.back!.status)}
            className="w-full"
          >
            {flow.back.label}
          </Button>
        )}
      </div>

      {/* Internal note */}
      <div className="mt-4 border-t border-line-soft pt-4">
        <label className="block">
          <span className="label">Internal note</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Private note"
            className="field"
          />
        </label>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={pending} onClick={persistNote}>
            Save note
          </Button>
          {noteSaved && <span className="text-[11px] font-semibold text-ok-400">Saved</span>}
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </div>
  );
}
