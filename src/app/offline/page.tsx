export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-lg font-semibold text-text-hi">You&apos;re offline</h1>
        <p className="mt-1.5 text-[13px] text-text-dim">
          The dashboard needs a connection to show live orders. Reconnect and try again.
        </p>
      </div>
    </main>
  );
}
