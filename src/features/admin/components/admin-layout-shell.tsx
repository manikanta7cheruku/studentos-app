"use client";

import * as React from "react";
import { AdminNav } from "@/features/admin/components/admin-nav";

type AdminLayoutShellProps = {
  basePath: string;
  children: React.ReactNode;
};

export function AdminLayoutShell({ basePath, children }: AdminLayoutShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6 pb-20 md:pb-6">
      <AdminNav basePath={basePath} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
