import { AppleIcon, PlayIcon } from "lucide-react";

function Store({ icon, small, name }: { icon: React.ReactNode; small: string; name: string }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title="Coming soon"
      className="group inline-flex h-14 cursor-default items-center gap-3 rounded-xl border border-white/20 bg-white/[0.04] px-5 text-left transition-colors hover:bg-white/[0.07]"
    >
      <span aria-hidden="true" className="text-ink [&_svg]:size-6">
        {icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          {small}
        </span>
        <span className="text-[16px] font-semibold tracking-tight">{name}</span>
      </span>
      <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f0c36a]">
        Soon
      </span>
    </button>
  );
}

/** The two store buttons. They are not live yet, so they say so; they become links when the apps are published. */
export function StoreButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Store icon={<PlayIcon fill="currentColor" />} small="Get it on" name="Google Play" />
      <Store icon={<AppleIcon fill="currentColor" />} small="Download on the" name="App Store" />
    </div>
  );
}
