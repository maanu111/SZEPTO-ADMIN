import type { Metadata } from "next";
import { Suspense } from "react";
import { adminExists } from "./actions";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const revalidate = 0;

export default async function LoginPage() {
  const hasOwner = await adminExists();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Suspense fallback={<div className="skeleton h-96 w-full max-w-sm rounded-2xl" />}>
        <LoginForm hasOwner={hasOwner} />
      </Suspense>
    </main>
  );
}
