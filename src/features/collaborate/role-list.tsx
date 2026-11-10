import type { TeamPostDetail } from "@/lib/api/endpoints";

/** The roles of a post: the name, the skills that help, and how many places are free. */
export function RoleList({ post }: { post: TeamPostDetail }) {
  return (
    <section aria-labelledby="roles" className="flex flex-col gap-3">
      <h2
        id="roles"
        className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      >
        Roles
      </h2>
      <ul className="divide-y divide-border border-y border-border">
        {post.roles.map((role) => {
          const free = Math.max(0, role.slots - role.filled);
          return (
            <li
              key={role.id}
              className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <h3 className="text-[18px] font-semibold">{role.role_name}</h3>
                {role.skills.length ? (
                  <p className="mt-1 text-[15px] text-ink-muted">
                    Helps if you know: {role.skills.join(", ")}
                  </p>
                ) : null}
              </div>
              <p className="tabular text-[15px] text-ink-muted sm:text-right">
                {free === 0 ? "No places left" : `${free} of ${role.slots} places free`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
