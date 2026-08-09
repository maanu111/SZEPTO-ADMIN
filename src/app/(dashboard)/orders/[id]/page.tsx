import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalIcon } from "@/components/icons";
import { PageHeader, Panel, StatusBadge, fullDate, inr } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { OrderActions } from "./OrderActions";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("code").eq("id", id).maybeSingle();
  return { title: data?.code ? `Order ${data.code}` : "Order" };
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!order) notFound();

  const lines = items ?? [];
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <>
      <RealtimeRefresh tables={["orders", "order_items"]} />
      <Link
        href="/orders"
        className="mb-3 inline-flex items-center gap-1 text-[12px] font-semibold text-text-dim transition-colors hover:text-text-hi"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All orders
      </Link>

      <PageHeader
        title={order.code}
        subtitle={`Placed ${fullDate(order.created_at)}`}
        action={<StatusBadge status={order.status} />}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Items */}
          <Panel
            title={`Items (${itemCount})`}
            padded={false}
          >
            <ul className="divide-y divide-line-soft">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-shell-850">
                    {l.image_url && (
                      <Image
                        src={l.image_url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                        unoptimized
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text-hi">
                      {l.name}
                    </span>
                    <span className="mt-0.5 block">
                      <span className="rounded bg-accent-500/12 px-1.5 py-0.5 text-[10px] font-bold text-accent-400">
                        {l.variant_label}
                      </span>
                      <span className="tnum ml-1.5 text-[11px] text-text-faint">× {l.qty}</span>
                      <span className="tnum ml-1.5 text-[11px] text-text-faint">
                        @ {inr(l.price)}
                      </span>
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[13px] font-semibold text-text-hi">
                    {inr(l.price * l.qty)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Bill — the same maths the customer saw */}
            <dl className="border-t border-line-soft px-4 py-3 text-[12px]">
              <Row label="Item total" value={inr(order.item_total)} />
              <Row
                label="Shipping"
                sub={`${Number(order.weight_kg).toFixed(2)} kg × ${inr(order.rate_per_kg)}/kg`}
                value={inr(order.shipping_cost)}
              />
              <Row
                label="Service charges"
                sub="Transport, packaging & handling"
                value={inr(order.service_charge)}
              />
              {order.savings > 0 && (
                <Row label="Customer saved" value={inr(order.savings)} tone="ok" />
              )}
              <div className="mt-2 flex items-center justify-between border-t border-dashed border-line pt-2.5">
                <dt className="text-[14px] font-semibold text-text-hi">Total</dt>
                <dd className="tnum text-[15px] font-semibold text-text-hi">{inr(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          {/* Payment proof */}
          <Panel title="Payment proof">
            <div className="flex flex-col gap-4 sm:flex-row">
              {order.payment_proof_url ? (
                <a
                  href={order.payment_proof_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block h-56 w-40 shrink-0 overflow-hidden rounded-xl border border-line bg-white"
                >
                  <Image
                    src={order.payment_proof_url}
                    alt="Payment screenshot"
                    fill
                    sizes="160px"
                    className="object-contain"
                    unoptimized
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <ExternalIcon className="h-5 w-5 text-white" />
                  </span>
                </a>
              ) : (
                <div className="flex h-56 w-40 shrink-0 items-center justify-center rounded-xl border border-dashed border-line px-3 text-center text-[11px] text-text-faint">
                  No screenshot uploaded
                </div>
              )}

              <dl className="min-w-0 flex-1 divide-y divide-line-soft text-[12px]">
                <Detail label="Amount claimed" value={inr(order.total)} />
                <Detail label="Reference ID" value={order.payment_ref || "—"} />
                <Detail label="Customer note" value={order.payment_note || "—"} />
                {order.payment_proof_url && (
                  <div className="pt-2.5">
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-400 hover:text-accent-500"
                    >
                      Open full size
                      <ExternalIcon className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </dl>
            </div>
          </Panel>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          <Panel title="Verification">
            <OrderActions id={order.id} status={order.status} adminNote={order.admin_note} />
          </Panel>

          <Panel title="Customer">
            <p className="text-[13px] font-semibold text-text-hi">{order.customer_name}</p>
            <a
              href={`tel:${order.customer_phone}`}
              className="tnum mt-0.5 block text-[12px] font-medium text-accent-400 hover:text-accent-500"
            >
              {order.customer_phone}
            </a>
            <p className="mt-3 text-[12px] leading-relaxed text-text-dim">
              {order.address}
              {order.landmark && `, ${order.landmark}`}
              <br />
              {order.city} · <span className="tnum">{order.pincode}</span>
            </p>
          </Panel>

          <Panel title="Consignment">
            <dl className="flex flex-col gap-2 text-[12px]">
              <Row label="Billable weight" value={`${Number(order.weight_kg).toFixed(2)} kg`} />
              <Row label="Rate applied" value={`${inr(order.rate_per_kg)} / kg`} />
              <Row label="Items" value={String(itemCount)} />
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Row({
  label,
  sub,
  value,
  tone,
}: {
  label: string;
  sub?: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <dt className="min-w-0 text-text-dim">
        {label}
        {sub && <span className="mt-0.5 block text-[10px] text-text-faint">{sub}</span>}
      </dt>
      <dd className={`tnum shrink-0 ${tone === "ok" ? "text-ok-400" : "text-text-hi"}`}>{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="text-text-dim">{label}</dt>
      <dd className="break-words font-medium text-text-hi">{value}</dd>
    </div>
  );
}
