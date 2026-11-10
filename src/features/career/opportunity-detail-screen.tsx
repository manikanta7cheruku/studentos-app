"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkIcon, CalendarIcon, ExternalLinkIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Opportunity } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { KIND_LABEL, MODE_LABEL, dateOnlyFromIso, stipendWords } from "./format";
import { deadlineLabel } from "./opportunities-screen";

function Actions({ op, inTracker }: { op: Opportunity; inTracker: string | null }) {
  const { slug } = useCollege();
  const router = useRouter();
  const attempt = useAttempt();
  const [saved, setSaved] = React.useState(op.saved);
  const [busy, setBusy] = React.useState<"save" | "track" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function toggleSave() {
    setBusy("save");
    setError(null);
    try {
      if (saved) await api.opportunities.unsave(op.id);
      else await api.opportunities.save(op.id);
      setSaved(!saved);
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not save that. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function addToTracker() {
    setBusy("track");
    setError(null);
    try {
      const created = await api.applications.create(
        {
          company: op.org,
          role_title: op.title,
          source_url: op.apply_url,
          deadline: dateOnlyFromIso(op.deadline),
          opportunity_id: op.id,
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`/c/${slug}/career/tracker/${created.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      setError(friendlyMessage(caught, "We could not add it to your tracker. Please try again."));
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href={op.apply_url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon aria-hidden="true" /> Apply on their site
          </a>
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => void toggleSave()}
          disabled={busy !== null}
        >
          {busy === "save" ? (
            <Spinner />
          ) : (
            <BookmarkIcon aria-hidden="true" className={saved ? "fill-current" : ""} />
          )}
          {saved ? "Saved" : "Save for later"}
        </Button>
        {inTracker ? (
          <Button asChild variant="outline" size="lg">
            <Link href={`/c/${slug}/career/tracker/${inTracker}`}>In your tracker</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            onClick={() => void addToTracker()}
            disabled={busy !== null}
          >
            {busy === "track" ? <Spinner /> : null} Add to my tracker
          </Button>
        )}
      </div>
      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
    </div>
  );
}

function Body({ op }: { op: Opportunity }) {
  const mine = useLoad(() => api.applications.list(), []);
  const inTracker =
    mine.status === "ready"
      ? (mine.data.find((a) => a.opportunity_id === op.id)?.id ?? null)
      : null;
  const stipend = stipendWords(op);
  const place = [op.location, MODE_LABEL[op.mode]].filter(Boolean).join(" · ");
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 border-b border-border pb-6">
        <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-ink">
          {KIND_LABEL[op.kind] ?? op.kind}
          {op.status === "expired" ? (
            <span className="ml-3 font-normal text-ink-muted">Closed</span>
          ) : null}
        </p>
        <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {op.title}
        </h1>
        <p className="text-[18px] text-ink-muted">
          {op.org}
          {place ? ` · ${place}` : ""}
        </p>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon aria-hidden="true" className="size-4" /> {deadlineLabel(op)}
          </span>
          {stipend ? <span className="tabular">{stipend}</span> : null}
        </p>
        {op.changed_since_saved ? (
          <Banner variant="warning" title="Changed since you saved it">
            <p>
              Your college edited this listing after you saved it. Read it again before you apply.
            </p>
          </Banner>
        ) : null}
        <Actions key={`${op.id}-${inTracker}`} op={op} inTracker={inTracker} />
      </header>
      {op.eligibility ? (
        <section aria-labelledby="eligibility" className="max-w-prose">
          <h2
            id="eligibility"
            className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
          >
            Who can apply
          </h2>
          <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{op.eligibility}</p>
        </section>
      ) : null}
      {op.skills.length ? (
        <section aria-labelledby="skills" className="flex flex-col gap-2">
          <h2
            id="skills"
            className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
          >
            Skills
          </h2>
          <ul className="flex flex-wrap gap-2">
            {op.skills.map((skill) => (
              <li
                key={skill}
                className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface px-3 text-[15px]"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-[14px] text-ink-muted">
        Posted by {op.posted_by}. Last checked{" "}
        {new Date(op.last_verified_at).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        . We do not collect listings from other sites.
      </p>
    </article>
  );
}

export function OpportunityDetailScreen({ id }: { id: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.opportunities.one(slug, id), [slug, id]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8 md:px-8 md:py-12">
      <Link
        href={`/c/${slug}/career/opportunities`}
        className="-ml-1 inline-flex min-h-11 w-fit items-center rounded-input px-1 text-[15px] font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Opportunities
      </Link>
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : state.status === "error" ? (
        state.error instanceof ApiError && state.error.status === 404 ? (
          <div className="rounded-card border border-border p-8">
            <p className="text-lg font-semibold">This opportunity is not available.</p>
            <p className="mt-1 text-ink-muted">It may have been removed by your college.</p>
          </div>
        ) : (
          <LoadError error={state.error} onRetry={state.reload} what="this opportunity" />
        )
      ) : (
        <Body op={state.data} />
      )}
    </div>
  );
}
