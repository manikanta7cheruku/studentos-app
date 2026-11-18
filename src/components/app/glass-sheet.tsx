"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";

/**
 * The app's sheet: neutral frosted glass that rises from the bottom on a phone and settles in the middle on a larger screen.
 * One component so every sheet moves and behaves the same way:
 *  - it opens and closes with its own slide (transform only, so it stays smooth) and never fades while the glass is on it;
 *  - the top of it is a drag handle: pull down to close, pull up only stretches a little and springs back, and the page behind
 *    never scrolls while a finger is on it;
 *  - a tap that starts on the dimmed page closes it, a tap that starts inside never does, even if the sheet moves under the
 *    finger before the finger lifts;
 *  - `typing` lifts it to the top of the screen for a box that has the keyboard (see .pro-sheet in globals.css).
 * The content goes in as children; give a scrolling part the class `pro-scroll` so it stops where the keyboard begins.
 */
export function GlassSheet({
  open,
  onOpenChange,
  title,
  description,
  lead,
  typing = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Something before the title in the top bar (a back arrow). */
  lead?: React.ReactNode;
  typing?: boolean;
  children: React.ReactNode;
}) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ y: number; t: number; dy: number } | null>(null);
  const scrimDown = React.useRef(false);

  function dragStart(event: React.PointerEvent<HTMLDivElement>) {
    if (window.innerWidth >= 640) return;
    if ((event.target as HTMLElement).closest("button")) return;
    drag.current = { y: event.clientY, t: event.timeStamp, dy: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    sheetRef.current?.setAttribute("data-dragging", "true");
  }
  function dragMove(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    current.dy = event.clientY - current.y;
    const shown = current.dy > 0 ? current.dy : Math.max(-18, current.dy * 0.12);
    sheetRef.current?.style.setProperty("--drag", `${shown}px`);
  }
  function dragEnd(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    drag.current = null;
    sheetRef.current?.removeAttribute("data-dragging");
    if (!current) return;
    const speed = current.dy / Math.max(1, event.timeStamp - current.t);
    if (current.dy > 110 || (current.dy > 40 && speed > 0.5)) onOpenChange(false);
    else sheetRef.current?.style.setProperty("--drag", "0px");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Overlay
          className="pro-scrim"
          onPointerDown={() => {
            scrimDown.current = true;
          }}
          onClick={() => {
            if (scrimDown.current) onOpenChange(false);
            scrimDown.current = false;
          }}
        />
        <DialogPrimitive.Content
          // The keyboard opens only when someone taps a box, never by itself the moment the sheet appears.
          onOpenAutoFocus={(event) => event.preventDefault()}
          // Closing by tapping the page is handled by the dimmed layer above, which knows where the tap began.
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          ref={sheetRef}
          data-typing={typing ? "true" : undefined}
          className="pro-sheet glass-pro"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/25 sm:hidden"
          />
          <div
            className="flex shrink-0 touch-none select-none items-start gap-2 max-sm:-mt-1 max-sm:pt-2"
            onPointerDown={dragStart}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            onPointerCancel={dragEnd}
          >
            {lead}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[17px] font-semibold tracking-tight">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="mt-1 text-[13px] text-ink/65">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="-mr-1.5 mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink/80 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon aria-hidden="true" className="size-[18px]" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
