"use client";

import * as React from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

type AdminErrorProps = {
  message?: string;
  requestId?: string;
  onRetry?: () => void;
};

export function AdminError({
  message = "Something went wrong loading this page.",
  requestId = "REQ-847291",
  onRetry,
}: AdminErrorProps) {
  return (
    <Banner variant="error" title="Error">
      <div className="flex flex-col gap-3">
        <p>{message}</p>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <p className="text-muted-foreground">Request ID: {requestId}</p>
      </div>
    </Banner>
  );
}
