"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { PinIcon, PlusIcon } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadError } from "@/components/app/load-error";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type AdminAnnouncement } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { usePaged } from "@/lib/use-paged";
import { useCollege } from "@/features/college";
import { ConsolePage, EmptyNote, ListSkeleton } from "./admin-shell";
import { PagedFooter } from "./paged-footer";

const STATUS_WORDS: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  expired: "Expired",
  removed: "Removed",
};

function Editor({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdminAnnouncement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { slug } = useCollege();
  const attempt = useAttempt();
  const [title, setTitle] = React.useState(editing?.title ?? "");
  const [body, setBody] = React.useState(editing?.body ?? "");
  const [pinned, setPinned] = React.useState(editing?.pinned ?? false);
  const [draft, setDraft] = React.useState(editing?.status === "draft");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function save() {
    if (busy) return;
    const problems: Record<string, string> = {};
    if (!title.trim()) problems.title = "Give the notice a title.";
    if (!body.trim()) problems.body = "Write the notice.";
    setFields(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api.admin.patchAnnouncement(slug, editing.id, {
          title: title.trim(),
          body: body.trim(),
          pinned,
          status: draft ? "draft" : "published",
        });
      } else {
        const created = await api.admin.createAnnouncement(
          slug,
          { title: title.trim(), body: body.trim(), pinned },
          attempt.get(),
        );
        attempt.reset();
        if (draft) await api.admin.patchAnnouncement(slug, created.id, { status: "draft" });
      }
      onSaved();
      onClose();
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(friendlyMessage(caught, "We could not save the notice. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit the notice" : "New notice"}</DialogTitle>
          <DialogDescription>
            Students see published notices on Campus and get a notification.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Title" error={fields.title} required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </FormField>
        <FormField label="Notice" error={fields.body} required>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={6}
          />
        </FormField>
        <div className="flex min-h-11 items-center justify-between gap-4 text-[14px]">
          <span id="pinned-label">Pin it to the top of Campus</span>
          <Switch aria-labelledby="pinned-label" checked={pinned} onCheckedChange={setPinned} />
        </div>
        <div className="flex min-h-11 items-center justify-between gap-4 text-[14px]">
          <span id="draft-label">Keep it as a draft (students do not see it yet)</span>
          <Switch aria-labelledby="draft-label" checked={draft} onCheckedChange={setDraft} />
        </div>
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Spinner /> : null} {editing ? "Save" : draft ? "Save draft" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  item,
  onEdit,
  onChanged,
}: {
  item: AdminAnnouncement;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const { slug } = useCollege();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run(call: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await call();
      onChanged();
    } catch (caught) {
      setError(friendlyMessage(caught, "We could not do that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const removed = item.status === "removed";
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-muted">
        <span className="font-semibold text-ink">{STATUS_WORDS[item.status] ?? item.status}</span>
        {item.pinned ? (
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <PinIcon aria-hidden="true" className="size-3.5" /> Pinned
          </span>
        ) : null}
        <span>by {item.author.display_name}</span>
      </div>
      <h2 className="text-[18px] font-semibold leading-snug">{item.title}</h2>
      <p className="line-clamp-2 max-w-prose text-[16px] text-ink-muted">{item.body}</p>
      {error ? <p className="text-[15px] text-danger">{error}</p> : null}
      {removed ? null : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} disabled={busy}>
            Edit
          </Button>
          {item.status === "draft" ? (
            <Button
              size="sm"
              onClick={() =>
                void run(() => api.admin.patchAnnouncement(slug, item.id, { status: "published" }))
              }
              disabled={busy}
            >
              Publish
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void run(() => api.admin.patchAnnouncement(slug, item.id, { pinned: !item.pinned }))
            }
            disabled={busy}
          >
            {item.pinned ? "Unpin" : "Pin"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void run(() => api.admin.removeAnnouncement(slug, item.id))}
            disabled={busy}
          >
            Remove
          </Button>
        </div>
      )}
    </li>
  );
}

/** Notices for the Campus tab: write, pin, keep as a draft, remove. */
export function AnnouncementsAdminScreen() {
  const { slug } = useCollege();
  const list = usePaged((cursor) => api.admin.announcements(slug, cursor), [slug]);
  const [editor, setEditor] = React.useState<{ item: AdminAnnouncement | null } | null>(null);

  return (
    <ConsolePage
      title="Announcements"
      description="Notices for your students. Published ones appear on Campus and in notifications."
      actions={
        <Button size="lg" onClick={() => setEditor({ item: null })}>
          <PlusIcon aria-hidden="true" /> New notice
        </Button>
      }
    >
      {list.state.status === "loading" ? (
        <ListSkeleton />
      ) : list.state.status === "error" ? (
        <LoadError error={list.state.error} onRetry={list.state.reload} what="the announcements" />
      ) : list.items.length === 0 ? (
        <EmptyNote>No notices yet. Post the first one: students see it on Campus.</EmptyNote>
      ) : (
        <>
          <ul className="divide-y divide-border border-y border-border">
            {list.items.map((item) => (
              <Row
                key={item.id}
                item={item}
                onEdit={() => setEditor({ item })}
                onChanged={list.state.reload}
              />
            ))}
          </ul>
          <PagedFooter
            hasMore={list.hasMore}
            loadingMore={list.loadingMore}
            moreError={list.moreError}
            onMore={list.more}
            count={list.items.length}
          />
        </>
      )}
      {editor ? (
        <Editor editing={editor.item} onClose={() => setEditor(null)} onSaved={list.state.reload} />
      ) : null}
    </ConsolePage>
  );
}
