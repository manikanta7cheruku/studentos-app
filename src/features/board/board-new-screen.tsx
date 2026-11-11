"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type BoardKind, type BoardName } from "@/lib/api/endpoints";
import { useAttempt } from "@/lib/use-attempt";
import { useCollege } from "@/features/college";
import { BOARDS, HAS_PRICE, KIND_LABEL, boardPath } from "./board-config";

/** The page for a new post on a board. The kind decides whether there is a price. */
export function BoardNewScreen({ board }: { board: BoardName }) {
  const { slug } = useCollege();
  const config = BOARDS[board];
  const router = useRouter();
  const attempt = useAttempt();
  const [kind, setKind] = React.useState<BoardKind>(config.kinds[0]!);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problems: Record<string, string> = {};
    if (title.trim().length < 5) problems.title = "Give it a title of at least 5 characters.";
    if (HAS_PRICE[kind] && price && Number(price) > 1_000_000)
      problems.price_inr = "At most 10,00,000.";
    setFields(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      const made = await api.board.create(
        slug,
        {
          board,
          kind,
          title: title.trim(),
          description: description.trim(),
          ...(place.trim() ? { place: place.trim() } : {}),
          ...(HAS_PRICE[kind] && price ? { price_inr: Number(price) } : {}),
        },
        attempt.get(),
      );
      attempt.reset();
      router.push(`${boardPath(slug, board)}/${made.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError && caught.isOffline)) attempt.reset();
      if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED")
        setFields(caught.fieldErrors);
      setError(friendlyMessage(caught, "We could not post this. Please try again."));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-6 md:px-8 md:py-10">
      <PageHeader
        title={config.newLabel}
        back={{ href: boardPath(slug, board), label: config.title }}
      />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <fieldset className="flex flex-col gap-3">
          <legend className="text-[13px] font-semibold text-ink-muted">What is it?</legend>
          <div className="flex flex-wrap gap-2">
            {config.kinds.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-5 text-[14px] font-semibold outline-none transition-[background-color,border-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                  kind === value
                    ? "bg-brand border-transparent text-white"
                    : "border-white/10 bg-white/[0.04] text-ink-muted hover:border-white/25 hover:text-ink",
                )}
              >
                {KIND_LABEL[value]}
              </button>
            ))}
          </div>
        </fieldset>
        <FormField label="Title" error={fields.title} required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder={
              board === "lostfound"
                ? "Black water bottle near the library"
                : "Engineering Maths, 2nd year, good condition"
            }
            autoFocus
          />
        </FormField>
        <FormField
          label="Details"
          help="Optional. What it looks like, its condition, when and where."
          error={fields.description}
        >
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1500}
            rows={4}
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label={board === "lostfound" ? "Where?" : "Where to meet?"}
            help="Optional."
            error={fields.place}
          >
            <Input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              maxLength={120}
            />
          </FormField>
          {HAS_PRICE[kind] ? (
            <FormField
              label={
                kind === "wanted"
                  ? "Your budget (₹)"
                  : kind === "rent"
                    ? "Price per day (₹)"
                    : "Price (₹)"
              }
              help="Whole rupees. Optional."
              error={fields.price_inr}
            >
              <Input
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/\D/g, "").slice(0, 7))}
              />
            </FormField>
          ) : null}
        </div>
        <p className="text-[13px] text-ink-muted">
          People write to you inside StudentOS. Your phone number and email are never shown.
        </p>
        {error ? (
          <Banner variant="error">
            <p>{error}</p>
          </Banner>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? (
              <>
                <Spinner /> Posting
              </>
            ) : (
              "Post"
            )}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
