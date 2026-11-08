"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetchEnvelope, ApiError } from "@/lib/api-client";
import { OpportunityCard } from "./opportunity-card";
import { FilterBar, DEFAULT_OPPORTUNITY_FILTERS, getActiveFilterCount } from "./filter-bar";
import {
  NoOpportunitiesEmptyState,
  NoOpportunityResultsEmptyState,
  NoSavedOpportunitiesEmptyState,
  OpportunitiesErrorState,
  OpportunitiesSkeleton,
} from "./empty-states";
import {
  opportunitySchema,
  type Opportunity,
  type OpportunityFilters,
  type OpportunityKind,
  type OpportunityMode,
  type OpportunityDeadlineFilter,
} from "./types";
import { z } from "zod";

export interface OpportunitiesScreenProps {
  slug: string;
  initialOpportunities?: Opportunity[];
}

function parseFiltersFromSearchParams(searchParams: URLSearchParams): OpportunityFilters {
  const kindParam = searchParams.get("kind");
  const skillsParam = searchParams.get("skills");
  const modeParam = searchParams.get("mode");
  const locationParam = searchParams.get("location");
  const deadlineParam = searchParams.get("deadline");

  const kinds: OpportunityKind[] = kindParam
    ? (kindParam.split(",").filter(Boolean) as OpportunityKind[])
    : [];

  const skills: string[] = skillsParam ? skillsParam.split(",").filter(Boolean) : [];

  const mode =
    modeParam === "onsite" || modeParam === "remote" || modeParam === "hybrid"
      ? (modeParam as OpportunityMode)
      : "all";

  const location = locationParam || "";

  const deadline =
    deadlineParam === "7d" || deadlineParam === "30d" || deadlineParam === "hide_closed"
      ? (deadlineParam as OpportunityDeadlineFilter)
      : "any";

  return {
    kinds,
    skills,
    mode,
    location,
    deadline,
    // Not trimmed here, so a space typed in the search box is not eaten. It is trimmed before the request.
    q: searchParams.get("q") ?? "",
    saved: searchParams.get("saved") === "true",
  };
}

function getFriendlyErrorMessage(err: unknown): { message: string; requestId?: string } {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "VALIDATION_FAILED":
        // 400 = the server rejected our filters. Anything else (the api-client uses 500 when the
        // response does not match the contract) is not caused by the person's filter choice.
        return {
          message:
            err.status === 400
              ? "The filter parameters were invalid. Please check your selection."
              : "We got an unexpected response from the server. Please try again.",
          requestId: err.requestId,
        };
      case "RATE_LIMITED":
        return {
          message: "Too many requests. Please wait a moment before trying again.",
          requestId: err.requestId,
        };
      case "FEATURE_DISABLED":
        return {
          message: "Career is not available for your college.",
          requestId: err.requestId,
        };
      case "MEMBERSHIP_NOT_ACTIVE":
        return {
          message: "Your college membership is not active yet. Please wait for approval.",
          requestId: err.requestId,
        };
      case "VERIFICATION_LEVEL_TOO_LOW":
        return {
          message: "Your student verification level is too low to view opportunities.",
          requestId: err.requestId,
        };
      case "UNAUTHENTICATED":
        return {
          message: "You must be signed in to view curated opportunities.",
          requestId: err.requestId,
        };
      default:
        return {
          message: err.message || "Failed to load opportunities. Please try again.",
          requestId: err.requestId,
        };
    }
  }

  return {
    message: err instanceof Error ? err.message : "Failed to load opportunities. Please try again.",
  };
}

export function OpportunitiesScreen({ slug, initialOpportunities }: OpportunitiesScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchParamsString = searchParams ? searchParams.toString() : "";

  // Parse filters from search params string
  const currentFilters = React.useMemo(() => {
    return parseFiltersFromSearchParams(new URLSearchParams(searchParamsString));
  }, [searchParamsString]);

  const [opportunities, setOpportunities] = React.useState<Opportunity[]>(
    initialOpportunities ?? [],
  );
  const [loading, setLoading] = React.useState<boolean>(!initialOpportunities);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [error, setError] = React.useState<{ message: string; requestId?: string } | null>(null);

  // Skill suggestions come from the listings loaded so far, plus any skill already selected.
  const allAvailableSkills = React.useMemo(() => {
    const set = new Set<string>(currentFilters.skills);
    for (const item of opportunities) {
      item.skills?.forEach((s) => set.add(s));
    }
    return Array.from(set).sort();
  }, [opportunities, currentFilters.skills]);

  // Construct query params to send to OPP-01
  // UNKNOWN QUERY PARAMS RETURN 400 VALIDATION_FAILED, so omit empty filters and send only contract params
  const buildApiQueryString = React.useCallback(
    (filters: OpportunityFilters, cursor?: string | null) => {
      const params = new URLSearchParams();

      if (filters.kinds && filters.kinds.length > 0) {
        params.set("kind", filters.kinds.join(","));
      }
      if (filters.skills && filters.skills.length > 0) {
        params.set("skills", filters.skills.join(","));
      }
      if (filters.mode && filters.mode !== "all") {
        params.set("mode", filters.mode);
      }
      if (filters.location && filters.location.trim().length > 0) {
        params.set("location", filters.location.trim());
      }
      if (filters.deadline && filters.deadline !== "any") {
        params.set("deadline", filters.deadline);
      }
      if (filters.q && filters.q.trim().length > 0) {
        params.set("q", filters.q.trim().slice(0, 80));
      }
      if (filters.saved) {
        params.set("saved", "true");
      }
      if (cursor) {
        params.set("cursor", cursor);
      }
      params.set("limit", "20");

      return params.toString();
    },
    [],
  );

  // Sync filter changes to URL search params (resets cursor)
  const handleFiltersChange = React.useCallback(
    (newFilters: OpportunityFilters) => {
      const params = new URLSearchParams();

      if (newFilters.kinds && newFilters.kinds.length > 0) {
        params.set("kind", newFilters.kinds.join(","));
      }
      if (newFilters.skills && newFilters.skills.length > 0) {
        params.set("skills", newFilters.skills.join(","));
      }
      if (newFilters.mode && newFilters.mode !== "all") {
        params.set("mode", newFilters.mode);
      }
      if (newFilters.location && newFilters.location.trim().length > 0) {
        params.set("location", newFilters.location.trim());
      }
      if (newFilters.deadline && newFilters.deadline !== "any") {
        params.set("deadline", newFilters.deadline);
      }
      if (newFilters.q && newFilters.q.trim().length > 0) {
        params.set("q", newFilters.q.slice(0, 80));
      }
      if (newFilters.saved) {
        params.set("saved", "true");
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      if (router) {
        router.push(newUrl);
      }
    },
    [pathname, router],
  );

  const [reloadKey, setReloadKey] = React.useState<number>(0);

  const handleRetry = React.useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const handleLoadMore = React.useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const qs = buildApiQueryString(currentFilters, nextCursor);
    const path = `/c/${slug}/opportunities?${qs}`;
    apiFetchEnvelope<Opportunity[]>(path, {
      schema: z.array(opportunitySchema),
    })
      .then((res) => {
        setOpportunities((prev) => [...prev, ...res.data]);
        setNextCursor(res.meta.next_cursor ?? null);
      })
      .catch((err) => {
        setError(getFriendlyErrorMessage(err));
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }, [buildApiQueryString, currentFilters, loadingMore, nextCursor, slug]);

  // Re-fetch when URL searchParams change or reload triggered
  React.useEffect(() => {
    let ignore = false;
    const qs = buildApiQueryString(currentFilters, null);
    const path = `/c/${slug}/opportunities?${qs}`;

    apiFetchEnvelope<Opportunity[]>(path, {
      schema: z.array(opportunitySchema),
    })
      .then((response) => {
        if (!ignore) {
          setOpportunities(response.data);
          setNextCursor(response.meta.next_cursor ?? null);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(getFriendlyErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [buildApiQueryString, currentFilters, searchParamsString, slug, reloadKey]);

  const handleClearFilters = () => {
    handleFiltersChange(DEFAULT_OPPORTUNITY_FILTERS);
  };

  const activeCount = getActiveFilterCount(currentFilters);
  const countText = `${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"} found`;

  return (
    <div className="mx-auto flex w-full max-w-4xl min-w-0 max-w-full flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      {/* Live region announcing result counts */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {loading ? "Loading opportunities..." : countText}
      </div>

      {/* Screen Header */}
      <header className="flex flex-col gap-1.5 min-w-0 max-w-full">
        <span className="text-base font-semibold uppercase tracking-wider text-ink-muted">
          Career
        </span>
        <h1 className="font-heading text-3xl font-bold text-ink break-words min-w-0 max-w-full">
          Curated Opportunities
        </h1>
        <p className="text-base text-ink-muted leading-relaxed break-words min-w-0 max-w-full">
          Verified internships, jobs, hackathons, and competitions curated for your college.
        </p>
      </header>

      {/* Filter Bar */}
      <FilterBar
        filters={currentFilters}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
        availableSkills={allAvailableSkills}
      />

      {/* Content Area */}
      <div className="flex flex-col gap-4 w-full min-w-0 max-w-full pt-2">
        {loading ? (
          <OpportunitiesSkeleton count={3} />
        ) : error ? (
          <OpportunitiesErrorState
            message={error.message}
            requestId={error.requestId}
            onRetry={handleRetry}
          />
        ) : opportunities.length === 0 ? (
          activeCount > 0 ? (
            currentFilters.saved && activeCount === 1 ? (
              <NoSavedOpportunitiesEmptyState />
            ) : (
              <NoOpportunityResultsEmptyState onClearFilters={handleClearFilters} />
            )
          ) : (
            <NoOpportunitiesEmptyState />
          )
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  slug={slug}
                  onViewTracker={() => router.push(`/c/${slug}/career`)}
                  onSaveToggle={(id, saved) => {
                    setOpportunities((prev) =>
                      currentFilters.saved && !saved
                        ? prev.filter((o) => o.id !== id)
                        : prev.map((o) => (o.id === id ? { ...o, saved } : o)),
                    );
                  }}
                  onAddToTracker={(opp) => {
                    setOpportunities((prev) =>
                      prev.map((o) => (o.id === opp.id ? { ...o, in_tracker: true } : o)),
                    );
                  }}
                />
              ))}
            </div>

            {/* Load more button */}
            {nextCursor ? (
              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="min-h-[44px] min-w-[160px] gap-2 px-6"
                >
                  {loadingMore ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <span>Load more</span>
                  )}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
