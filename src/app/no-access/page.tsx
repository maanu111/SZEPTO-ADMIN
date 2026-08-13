import Link from "next/link";

export const metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-shell-900 p-6 text-center">
        <h1 className="text-lg font-semibold text-text-hi">No access</h1>
        <p className="mt-2 text-[13px] text-text-dim">
          You don&apos;t have access to that page. Ask the owner if you need it.
        </p>
        <Link
          href="/"
          className="mt-5 flex h-10 items-center justify-center rounded-lg border border-line bg-shell-850 text-[13px] font-semibold text-text-hi transition-colors hover:border-shell-700"
        >
          Go back
        </Link>
      </div>
    </main>
  );
}
