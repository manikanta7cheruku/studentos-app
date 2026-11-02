import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice | StudentOS",
};

export default function Page() {
  return (
    <main id="main" className="mx-auto flex min-h-[60vh] max-w-3xl flex-col gap-4 px-4 py-16">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Privacy Notice</h1>
      <p className="text-lg text-muted-foreground">
        This page is a draft and is still being written. Please check back soon.
      </p>
      <Link href="/" className="font-medium text-primary underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
