"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminScreenSkeleton } from "./admin-screen-skeleton";
import { AdminError } from "./admin-error";
import { useAdminData } from "../use-admin-data";
import { sampleSettings } from "../sample-data";
import type { CollegeSettings } from "../types";

function SettingsForm({ initialData }: { initialData: CollegeSettings }) {
  const [collegeName, setCollegeName] = useState(initialData.collegeName);
  const [emailDomain, setEmailDomain] = useState(initialData.emailDomain);
  const [nameError, setNameError] = useState<string | undefined>();
  const [domainError, setDomainError] = useState<string | undefined>();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;

    if (!collegeName.trim()) {
      setNameError("College name is required.");
      hasError = true;
    } else {
      setNameError(undefined);
    }

    if (!emailDomain.trim()) {
      setDomainError("Email domain is required.");
      hasError = true;
    } else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(emailDomain.trim())) {
      setDomainError("Enter a valid domain like example.edu.");
      hasError = true;
    } else {
      setDomainError(undefined);
    }

    if (hasError) return;

    toast.success("College settings saved.");
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <FormField label="College name" required error={nameError}>
        <Input
          value={collegeName}
          onChange={(e) => {
            setCollegeName(e.target.value);
            if (e.target.value.trim()) setNameError(undefined);
          }}
          placeholder="e.g. Example Engineering College"
        />
      </FormField>

      <FormField
        label="Email domain"
        required
        help="Only emails ending in this domain can join."
        error={domainError}
      >
        <Input
          value={emailDomain}
          onChange={(e) => {
            setEmailDomain(e.target.value);
            if (e.target.value.trim()) setDomainError(undefined);
          }}
          placeholder="e.g. example.edu"
        />
      </FormField>

      <div className="pt-2">
        <Button type="submit">Save settings</Button>
      </div>
    </form>
  );
}

export function SettingsScreen() {
  const { data, isLoading, error, reload } = useAdminData<CollegeSettings>(sampleSettings);

  if (isLoading) return <AdminScreenSkeleton rows={2} />;
  if (error) return <AdminError message={error} onRetry={reload} />;
  if (!data) {
    return (
      <EmptyState
        title="No settings found"
        description="Settings for this college could not be loaded."
        action={<Button onClick={reload}>Retry</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold break-words min-w-0">Settings</h1>
        <p className="text-muted-foreground break-words">Manage your college profile on StudentOS.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>College details</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm initialData={data} />
        </CardContent>
      </Card>
    </div>
  );
}
