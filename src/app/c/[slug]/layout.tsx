// Everything under /c/{slug}. The college screens (campus, me, admin ...) are in the (app) group, which sits behind the
// college gate and shell. The public pages (the college landing page, join, pending) are in the (public) group.
export const instant = false;

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
