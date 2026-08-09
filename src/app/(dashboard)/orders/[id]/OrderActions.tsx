"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { Button, ErrorNote } from "@/components/ui";
import type { OrderStatus } from "@/lib/database.types";
import { saveAdminNote, setOrderStatus } from "./actions";

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
      {status === "pending" ? (
        <>
          <div className="flex flex-col gap-2">
            <Button
              variant="ok"
              size="lg"
              disabled={pending}
              onClick={() => run("confirmed")}
              className="w-full"
            >
              <CheckIcon className="h-4 w-4" />
              {pending ? "Working…" : "Confirm payment"}
            </Button>

            {confirmingCancel ? (
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
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            size="md"
            disabled={pending}
            onClick={() => run("pending")}
            className="w-full"
          >
            Move back to pending
          </Button>
        </div>
      )}

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
