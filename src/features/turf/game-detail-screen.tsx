"use client";

import * as React from "react";
import {
  CalendarClockIcon,
  CheckIcon,
  HourglassIcon,
  MapPinIcon,
  Share2Icon,
  TrophyIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Banner } from "@/components/ui/banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/app/avatar";
import { GlassSheet } from "@/components/app/glass-sheet";
import { LoadError } from "@/components/app/load-error";
import { PageHeader } from "@/components/app/page-header";
import { Spinner } from "@/components/app/spinner";
import { ApiError, friendlyMessage } from "@/lib/api-client";
import { api, type Game } from "@/lib/api/endpoints";
import { useLoad } from "@/lib/use-load";
import { useCollege } from "@/features/college";
import { FillBar, StatusPill, priceText } from "./game-card";
import { isOver, spotsLeft, titleCase, whenParts } from "./game-format";

type Confirm =
  { kind: "leave" } | { kind: "cancel" } | { kind: "remove"; userId: string; name: string } | null;

/** A glass sheet that asks once before something that cannot be undone, and says what will happen. */
function ConfirmSheet({
  confirm,
  game,
  busy,
  onClose,
  onYes,
}: {
  confirm: Confirm;
  game: Game;
  busy: boolean;
  onClose: () => void;
  onYes: () => void;
}) {
  const copy =
    confirm?.kind === "leave"
      ? {
          title: game.my_status === "joined" ? "Say you cannot make it?" : "Leave the list?",
          text:
            game.my_status === "joined"
              ? "Your place goes to the next person waiting, and the host is told."
              : "You will lose your place in line.",
          yes: game.my_status === "joined" ? "I cannot make it" : "Leave",
        }
      : confirm?.kind === "cancel"
        ? {
            title: "Cancel this game?",
            text: "Everyone who is in or waiting is told. This cannot be undone.",
            yes: "Cancel game",
          }
        : confirm?.kind === "remove"
          ? {
              title: `Remove ${confirm.name}?`,
              text: "They are told and their place goes to the next person waiting.",
              yes: "Remove",
            }
          : { title: "", text: "", yes: "" };
  return (
    <GlassSheet
      open={confirm !== null}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      title={copy.title}
    >
      <p className="text-[14px] leading-relaxed text-ink-muted">{copy.text}</p>
      <div className="flex gap-2.5 pt-5">
        <button type="button" onClick={onClose} className="profile-btn flex-1">
          Keep it
        </button>
        <button
          type="button"
          onClick={onYes}
          disabled={busy}
          className="profile-btn profile-btn-primary flex-1"
        >
          {busy ? <Spinner /> : null} {copy.yes}
        </button>
      </div>
    </GlassSheet>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-white/[0.14] bg-white/[0.07] text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] [&_svg]:size-[1.05rem]"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</p>
        <div className="text-[14.5px] font-medium leading-snug">{children}</div>
      </div>
    </div>
  );
}

/** One game: when and where, who is in, and what I can do (join, wait, leave) or, for the host, who to let in. */
export function GameDetailScreen({ gameId }: { gameId: string }) {
  const { slug } = useCollege();
  const loaded = useLoad(() => api.games.one(slug, gameId), [slug, gameId]);
  const [latest, setLatest] = React.useState<Game | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<Confirm>(null);

  const game = latest ?? (loaded.status === "ready" ? loaded.data : null);

  async function act(name: string, run: () => Promise<Game>, done?: string) {
    if (busy) return;
    setBusy(name);
    setError(null);
    try {
      setLatest(await run());
      setConfirm(null);
      if (done) toast.success(done);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : null;
      setError(
        code === "FORBIDDEN" && name === "join"
          ? "The host is not taking you for this game."
          : code === "CONFLICT"
            ? "This game is closed, or something just changed. Reload to see the latest."
            : code === "SLOTS_FULL"
              ? "Every place is taken. Decline someone, or let the next person wait."
              : friendlyMessage(caught, "That did not work. Please try again."),
      );
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function share(current: Game) {
    const when = whenParts(current);
    const url = `${window.location.origin}/c/${slug}/turf/${current.id}`;
    const text = `${titleCase(current.sport)} at ${current.venue}, ${when.day} ${when.time}. Join me on StudentOS.`;
    try {
      if (navigator.share) await navigator.share({ title: "A game on StudentOS", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success("Link copied");
      }
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-4 pb-2 md:px-8 md:py-8">
      <PageHeader title="Game" back={{ href: `/c/${slug}/turf`, label: "Turf and courts" }} />
      {loaded.status === "loading" && !game ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-56 w-full rounded-[24px]" />
          <Skeleton className="h-40 w-full rounded-[24px]" />
        </div>
      ) : !game ? (
        <LoadError
          error={loaded.status === "error" ? loaded.error : undefined}
          onRetry={loaded.reload}
          what="this game"
        />
      ) : (
        <Body
          game={game}
          busy={busy}
          error={error}
          onShare={() => void share(game)}
          onJoin={() => void act("join", () => api.games.join(slug, game.id))}
          onAsk={(kind) => setConfirm({ kind })}
          onDecide={(userId, decision, name) => {
            if (decision === "removed") setConfirm({ kind: "remove", userId, name });
            else
              void act(`decide-${userId}`, () =>
                api.games.decide(slug, game.id, { user_id: userId, decision }),
              );
          }}
        />
      )}
      {game ? (
        <ConfirmSheet
          confirm={confirm}
          game={game}
          busy={busy !== null}
          onClose={() => setConfirm(null)}
          onYes={() => {
            if (confirm?.kind === "leave") void act("leave", () => api.games.leave(slug, game.id));
            else if (confirm?.kind === "cancel")
              void act("cancel", () => api.games.cancel(slug, game.id));
            else if (confirm?.kind === "remove")
              void act("remove", () =>
                api.games.decide(slug, game.id, { user_id: confirm.userId, decision: "removed" }),
              );
          }}
        />
      ) : null}
    </div>
  );
}

function Body({
  game,
  busy,
  error,
  onShare,
  onJoin,
  onAsk,
  onDecide,
}: {
  game: Game;
  busy: string | null;
  error: string | null;
  onShare: () => void;
  onJoin: () => void;
  onAsk: (kind: "leave" | "cancel") => void;
  onDecide: (userId: string, decision: "accepted" | "declined" | "removed", name: string) => void;
}) {
  const when = whenParts(game);
  const over = isOver(game);
  const cancelled = game.status === "cancelled";
  const closed = over || cancelled;
  const left = spotsLeft(game);
  const full = left === 0;
  const pending = game.requests.filter((r) => r.status === "requested");
  const waiting = game.requests.filter((r) => r.status === "waitlist");

  return (
    <>
      <section className="glass-card flex flex-col gap-5 rounded-[24px] p-5">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-[15px] border border-white/[0.14] bg-white/[0.07] text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          >
            <TrophyIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              {titleCase(game.sport)}
            </p>
            <h1 className="font-heading text-[1.45rem] font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere]">
              {game.venue}
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              Hosted by {game.is_host ? "you" : game.host.display_name}
            </p>
          </div>
          <StatusPill game={game} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Fact icon={<CalendarClockIcon />} label="When">
            {when.day}
            <span className="block text-[13px] font-normal text-ink-muted">{when.time}</span>
          </Fact>
          <Fact icon={<MapPinIcon />} label="Where">
            {game.area ?? game.venue}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${game.venue} ${game.area ?? ""}`.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[13px] font-semibold text-[#cfcaff] underline-offset-4 hover:underline"
            >
              Open in Maps
            </a>
          </Fact>
          <Fact icon={<WalletIcon />} label="Each person pays">
            {priceText(game).replace(" each", "")}
            <span className="block text-[13px] font-normal text-ink-muted">
              {game.price_inr ? "Pay the host on the day" : "No cost"}
            </span>
          </Fact>
          <Fact icon={<UsersIcon />} label="Joining">
            {game.join_mode === "open" ? "Open to everyone" : "The host approves"}
            <span className="block text-[13px] font-normal text-ink-muted">
              {full
                ? "Full, with a waiting list"
                : `${left} ${left === 1 ? "place" : "places"} left`}
            </span>
          </Fact>
        </div>

        <div className="flex flex-col gap-2">
          <FillBar game={game} />
          <p className="tabular text-[13px] text-ink-muted">
            {game.joined_count} of {game.capacity} in
            {game.waitlist_count > 0 ? ` · ${game.waitlist_count} waiting` : ""}
          </p>
        </div>

        {game.note ? (
          <p className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[14px] leading-relaxed text-ink/90 [overflow-wrap:anywhere]">
            {game.note}
          </p>
        ) : null}
      </section>

      {error ? (
        <Banner variant="error">
          <p>{error}</p>
        </Banner>
      ) : null}
      {cancelled ? (
        <Banner variant="error">
          <p>The host cancelled this game.</p>
        </Banner>
      ) : over ? (
        <Banner variant="info">
          <p>This game has been played.</p>
        </Banner>
      ) : null}

      {!closed ? (
        <section aria-label="Your place" className="flex flex-col gap-2.5">
          {game.is_host ? (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onShare}
                className="profile-btn profile-btn-primary flex-1"
              >
                <Share2Icon aria-hidden="true" /> Invite people
              </button>
              <button type="button" onClick={() => onAsk("cancel")} className="profile-btn flex-1">
                Cancel game
              </button>
            </div>
          ) : game.my_status === "joined" ? (
            <>
              <p className="glass-card flex items-center gap-2.5 rounded-[18px] px-4 py-3 text-[14.5px] font-semibold">
                <CheckIcon aria-hidden="true" className="size-5 text-[#cfcaff]" /> You are in
              </p>
              <div className="flex gap-2.5">
                <button type="button" onClick={onShare} className="profile-btn flex-1">
                  <Share2Icon aria-hidden="true" /> Share
                </button>
                <button type="button" onClick={() => onAsk("leave")} className="profile-btn flex-1">
                  I cannot make it
                </button>
              </div>
            </>
          ) : game.my_status === "requested" || game.my_status === "waitlist" ? (
            <>
              <p className="glass-card flex items-center gap-2.5 rounded-[18px] px-4 py-3 text-[14.5px]">
                <HourglassIcon aria-hidden="true" className="size-5 shrink-0 text-ink-muted" />
                <span>
                  <span className="block font-semibold">
                    {game.my_status === "requested"
                      ? "Request sent"
                      : `You are on the waiting list${game.my_place ? `, number ${game.my_place}` : ""}`}
                  </span>
                  <span className="block text-[13px] text-ink-muted">
                    {game.my_status === "requested"
                      ? "The host will answer, and you will be told."
                      : "If a place opens you move up, and you are told."}
                  </span>
                </span>
              </p>
              <button type="button" onClick={() => onAsk("leave")} className="profile-btn w-full">
                {game.my_status === "requested" ? "Withdraw request" : "Leave the list"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              disabled={busy !== null}
              className="profile-btn profile-btn-primary w-full !h-11 !text-[15px]"
            >
              {busy === "join" ? <Spinner /> : null}
              {game.join_mode === "open"
                ? full
                  ? "Join the waiting list"
                  : "Join game"
                : full
                  ? "Ask to join, waiting list"
                  : "Ask to join"}
            </button>
          )}
        </section>
      ) : null}

      {game.is_host && !closed && game.requests.length > 0 ? (
        <section
          className="glass-card flex flex-col gap-3 rounded-[22px] p-4"
          aria-label="Requests"
        >
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            {pending.length > 0
              ? `Waiting for your answer · ${pending.length}`
              : "Waiting for a place"}
          </h2>
          <ul className="flex flex-col divide-y divide-white/[0.07]">
            {[...pending, ...waiting].map((request) => (
              <li
                key={request.user_id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <Avatar name={request.display_name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">
                    {request.display_name}
                  </span>
                  <span className="block text-[12.5px] text-ink-muted">
                    {request.status === "requested" ? "Asked to join" : "Waiting for a place"}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Decline ${request.display_name}`}
                  disabled={busy !== null}
                  onClick={() => onDecide(request.user_id, "declined", request.display_name)}
                  className="profile-btn profile-btn-icon"
                >
                  <XIcon aria-hidden="true" className="!size-[1.1rem]" />
                </button>
                <button
                  type="button"
                  aria-label={`Accept ${request.display_name}`}
                  disabled={busy !== null || full}
                  title={full ? "Every place is taken" : undefined}
                  onClick={() => onDecide(request.user_id, "accepted", request.display_name)}
                  className="profile-btn profile-btn-primary profile-btn-icon"
                >
                  <CheckIcon aria-hidden="true" className="!size-[1.1rem]" />
                </button>
              </li>
            ))}
          </ul>
          {full ? (
            <p className="text-[12.5px] text-ink-muted">
              Every place is taken. Someone has to drop out before you can accept more.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="glass-card flex flex-col gap-3 rounded-[22px] p-4" aria-label="Players">
        <h2 className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Players · {game.joined_count} of {game.capacity}
        </h2>
        <ul className="flex flex-col divide-y divide-white/[0.07]">
          {game.players.map((player) => (
            <li
              key={player.user_id}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <Avatar name={player.display_name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">
                {player.display_name}
              </span>
              {player.is_host ? (
                <span className="inline-flex h-6 items-center rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 text-[11.5px] font-semibold text-ink/80">
                  Host
                </span>
              ) : game.is_host && !closed ? (
                <button
                  type="button"
                  onClick={() => onDecide(player.user_id, "removed", player.display_name)}
                  className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-ink-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!closed && left > 0 ? (
          <p className="text-[12.5px] text-ink-muted">
            {left} {left === 1 ? "place" : "places"} still open.
          </p>
        ) : null}
      </section>
    </>
  );
}
