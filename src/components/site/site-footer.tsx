import Link from "next/link";
import { Wordmark } from "@/features/auth/auth-frame";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how", label: "How it works" },
      { href: "/#coming", label: "Coming soon" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/privacy", label: "Privacy Notice" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/guidelines", label: "Community Guidelines" },
      { href: "/safety", label: "Safety" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/setup", label: "For colleges" },
      { href: "/contact", label: "Contact" },
      { href: "/signin", label: "Sign in" },
    ],
  },
];

/** The footer of every public page. */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[rgba(255,255,255,0.015)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
            Plans, ideas and people from your campus and beyond. Made for students.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">
              {column.title}
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-[14px] text-ink-muted">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-[12.5px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 StudentOS. All rights reserved.</p>
          <p>Made for students.</p>
        </div>
      </div>
    </footer>
  );
}
