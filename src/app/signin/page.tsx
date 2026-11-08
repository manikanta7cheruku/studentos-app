import type { Metadata } from "next";
import { Suspense } from "react";
import { SigninScreen } from "@/features/auth/signin-screen";

export const instant = false;

export const metadata: Metadata = {
  title: "Sign in | StudentOS",
  description: "Sign in to StudentOS with a code sent to your email.",
};

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninScreen />
    </Suspense>
  );
}
