"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { PostForm } from "./post-form";

export function NewPostScreen() {
  const { slug } = useCollege();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Post plan"
        description="Say what you are building and which roles you need. Classmates ask to join a role, and you decide."
        back={{ href: `/c/${slug}/collaborate`, label: "Plans" }}
      />
      <PostForm />
    </div>
  );
}

export function EditPostScreen({ postId }: { postId: string }) {
  const { slug } = useCollege();
  const state = useLoad(() => api.teamPosts.one(slug, postId), [slug, postId]);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader
        title="Edit your post"
        description="Change the details. The roles stay as they are."
        back={{ href: `/c/${slug}/collaborate/${postId}`, label: "The post" }}
      />
      {state.status === "loading" ? (
        <div aria-busy="true" className="flex max-w-2xl flex-col gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={state.reload} what="this post" />
      ) : state.data.is_owner ? (
        <PostForm editing={state.data} />
      ) : (
        <p className="text-lg text-ink-muted">Only the author can edit this post.</p>
      )}
    </div>
  );
}
