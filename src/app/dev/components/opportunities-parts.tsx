"use client";

import * as React from "react";
import {
  OpportunityCard,
  FilterBar,
  NoOpportunitiesEmptyState,
  NoOpportunityResultsEmptyState,
  OpportunitiesErrorState,
  OpportunitiesSkeleton,
  type Opportunity,
  type OpportunityFilters,
} from "@/features/opportunities";
import opp01 from "@/contracts/fixtures/opp-01.success.json";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StateCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 w-full">
      <span className="text-base text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function OpportunitiesSections() {
  const [filters, setFilters] = React.useState<OpportunityFilters>({
    kinds: ["internship"],
    skills: ["React"],
    mode: "hybrid",
    location: "Bangalore",
    deadline: "7d",
  });

  const baseOpp = { ...opp01.data[0], in_tracker: false } as unknown as Opportunity;
  const openOpp: Opportunity = { ...baseOpp };
  const closedOpp: Opportunity = {
    ...baseOpp,
    id: "dddddddd-0000-4000-8000-0000000000c2",
    status: "expired",
    deadline: "2026-10-01T00:00:00Z",
  };
  const unpaidOpp: Opportunity = {
    ...baseOpp,
    id: "dddddddd-0000-4000-8000-0000000000c3",
    stipend_min: null,
    stipend_max: null,
    mode: "remote",
  };
  const demoRefDate = new Date("2026-11-05T00:00:00Z");

  return (
    <>
      <Section title="Opportunities — OpportunityCard">
        <div className="grid gap-6 lg:grid-cols-2">
          <StateCell label="Standard Internship (Paise converted, Hybrid, Open deadline)">
            <OpportunityCard opportunity={openOpp} slug="alpha" referenceDate={demoRefDate} />
          </StateCell>
          <StateCell label="Closed Opportunity (Past deadline)">
            <OpportunityCard opportunity={closedOpp} slug="alpha" referenceDate={demoRefDate} />
          </StateCell>
          <StateCell label="Unpaid / Competition (Null stipend, Remote)">
            <OpportunityCard opportunity={unpaidOpp} slug="alpha" referenceDate={demoRefDate} />
          </StateCell>
        </div>
      </Section>

      <Section title="Opportunities — FilterBar">
        <StateCell label="FilterBar (Desktop inline, mobile sheet)">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onClear={() =>
              setFilters({
                kinds: [],
                skills: [],
                mode: "all",
                location: "",
                deadline: "any",
              })
            }
            availableSkills={["React", "TypeScript", "Python", "Go", "Machine Learning"]}
          />
        </StateCell>
      </Section>

      <Section title="Opportunities — Empty & Error States">
        <div className="grid gap-6 lg:grid-cols-2">
          <StateCell label="No opportunities in college">
            <NoOpportunitiesEmptyState />
          </StateCell>
          <StateCell label="No filter results (Clear action)">
            <NoOpportunityResultsEmptyState onClearFilters={() => {}} />
          </StateCell>
          <StateCell label="Error state with Retry and Request ID">
            <OpportunitiesErrorState
              message="The server took too long to respond."
              requestId="req_sample_err_9981"
              onRetry={() => {}}
            />
          </StateCell>
          <StateCell label="Loading Skeleton">
            <OpportunitiesSkeleton count={1} />
          </StateCell>
        </div>
      </Section>
    </>
  );
}
