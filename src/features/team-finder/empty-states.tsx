"use client";

import * as React from "react";
import { SearchXIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export interface NoPostsEmptyStateProps {
  onCreatePost?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function NoPostsEmptyState({ onCreatePost, action, className }: NoPostsEmptyStateProps) {
  return (
    <EmptyState
      icon={<UsersIcon aria-hidden="true" />}
      title="No team posts yet"
      description="Be the first in your college to post a team request for a project, startup, hackathon, or competition."
      action={
        action ??
        (onCreatePost ? (
          <Button type="button" onClick={onCreatePost} className="min-h-[44px]">
            Post a team request
          </Button>
        ) : undefined)
      }
      className={className}
    />
  );
}

export interface NoFilterResultsEmptyStateProps {
  onClearFilters?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function NoFilterResultsEmptyState({
  onClearFilters,
  action,
  className,
}: NoFilterResultsEmptyStateProps) {
  return (
    <EmptyState
      icon={<SearchXIcon aria-hidden="true" />}
      title="No results for these filters"
      description="No team posts matched your search criteria. Try removing filters or searching for different skills."
      action={
        action ??
        (onClearFilters ? (
          <Button type="button" variant="outline" onClick={onClearFilters} className="min-h-[44px]">
            Clear filters
          </Button>
        ) : undefined)
      }
      className={className}
    />
  );
}

export interface NoRequestsEmptyStateProps {
  action?: React.ReactNode;
  className?: string;
}

export function NoRequestsEmptyState({ action, className }: NoRequestsEmptyStateProps) {
  return (
    <EmptyState
      icon={<UserPlusIcon aria-hidden="true" />}
      title="No requests yet"
      description="When students request to join your open roles, their applications and notes will appear here."
      action={action}
      className={className}
    />
  );
}

export type TeamFinderEmptyVariant = "no-posts" | "no-results" | "no-requests";

export interface TeamFinderEmptyStateProps {
  variant: TeamFinderEmptyVariant;
  onCreatePost?: () => void;
  onClearFilters?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function TeamFinderEmptyState({
  variant,
  onCreatePost,
  onClearFilters,
  action,
  className,
}: TeamFinderEmptyStateProps) {
  switch (variant) {
    case "no-posts":
      return (
        <NoPostsEmptyState onCreatePost={onCreatePost} action={action} className={className} />
      );
    case "no-results":
      return (
        <NoFilterResultsEmptyState
          onClearFilters={onClearFilters}
          action={action}
          className={className}
        />
      );
    case "no-requests":
      return <NoRequestsEmptyState action={action} className={className} />;
  }
}
