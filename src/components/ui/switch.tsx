"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "cn";

/**
 * The StudentOS switch. The track fills with the brand gradient from behind the knob, the knob stretches while it is
 * pressed and springs back, and a small tick fades in when it is on. Works with the keyboard (space) like any switch.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border border-white/10 bg-white/[0.09] p-[2px] outline-none transition-[background-color,border-color,box-shadow] duration-300 ease-[var(--ease)] hover:border-white/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-transparent data-[state=checked]:shadow-[0_0_18px_-4px_rgba(154,63,230,0.9)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="bg-brand absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-data-[state=checked]/switch:opacity-100"
      />
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="relative z-10 flex h-[20px] w-[20px] items-center justify-center rounded-full bg-white text-[#5b4cf5] shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-[transform,width] duration-300 ease-[var(--spring)] data-[state=checked]:translate-x-[20px] group-active/switch:w-[26px] group-active/switch:data-[state=checked]:translate-x-[14px]"
      >
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="size-[10px] opacity-0 transition-opacity duration-200 group-data-[state=checked]/switch:opacity-100"
        >
          <path
            d="M2.5 6.4l2.3 2.3 4.7-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
