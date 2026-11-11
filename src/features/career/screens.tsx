"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { ApplicationForm } from "./application-form";

export function NewApplicationScreen() {
  const { slug } = useCollege();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Add an application"
        description="Only you can see it. You can change the details and move it along later."
        back={{ href: `/c/${slug}/career`, label: "My applications" }}
      />
      <ApplicationForm />
    </div>
  );
}

export function EditApplicationScreen({ id }: { id: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.applications.one(id), [id]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Edit application"
        description="The status is changed on the application page, so every change is kept in its history."
        back={{ href: `/c/${slug}/career/tracker/${id}`, label: "The application" }}
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex max-w-2xl flex-col gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="this application" />
      ) : (
        <ApplicationForm editing={state.data} />
      )}
    </div>
  );
}
