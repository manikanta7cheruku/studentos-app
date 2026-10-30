// Smoke test for a deployed copy of the app (staging). Changes nothing: only reads and refused requests.
// Usage: node scripts/smoke.mjs https://your-staging-url
//   EXPECT_COMMIT=<sha>  wait up to 10 minutes until /api/health reports this commit (the new deploy is live)
//   EXPECT_COLLEGE=alpha the college slug that the staging seed creates (default alpha)
const base = (process.argv[2] ?? process.env.STAGING_URL ?? "").replace(/\/$/, "");
if (!base.startsWith("https://") && !base.startsWith("http://localhost")) {
  console.error(
    "Give the app URL as the first argument. It must start with https:// (or http://localhost).",
  );
  process.exit(2);
}
const college = process.env.EXPECT_COLLEGE ?? "alpha";
const expectCommit = process.env.EXPECT_COMMIT;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const get = async (path, init) => {
  let response;
  try {
    response = await fetch(`${base}${path}`, { redirect: "manual", ...init });
  } catch {
    return { status: 0, json: null, headers: new Headers() };
  }
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, headers: response.headers };
};

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

if (expectCommit) {
  const deadline = Date.now() + 10 * 60 * 1000;
  let live = null;
  while (Date.now() < deadline) {
    const health = await get("/api/health").catch(() => null);
    live = health?.json?.commit ?? null;
    if (live === expectCommit) break;
    console.log(
      `waiting for commit ${expectCommit.slice(0, 7)}, live is ${live ? live.slice(0, 7) : "unknown"}`,
    );
    await wait(15_000);
  }
  check("the new commit is live", live === expectCommit, `live ${live ?? "unknown"}`);
}

const health = await get("/api/health");
check(
  "GET /api/health is ok",
  health.status === 200 && health.json?.status === "ok",
  `status ${health.status}`,
);

const ready = await get("/api/ready");
check(
  "GET /api/ready can reach the database",
  ready.status === 200 && ready.json?.status === "ready",
  `status ${ready.status}`,
);

const publicCollege = await get(`/api/v1/colleges/public/${college}`);
check(
  `GET /api/v1/colleges/public/${college} shows the seeded college`,
  publicCollege.status === 200 && publicCollege.json?.data?.slug === college,
  `status ${publicCollege.status}`,
);

const nope = await get("/api/v1/colleges/public/no-such-college");
check(
  "an unknown college is 404 NOT_FOUND",
  nope.status === 404 && nope.json?.error?.code === "NOT_FOUND",
  `status ${nope.status}`,
);

const noSession = await get(`/api/v1/c/${college}/me/membership`);
check(
  "a member endpoint without a session is 401",
  noSession.status === 401 && noSession.json?.error?.code === "UNAUTHENTICATED",
  `status ${noSession.status}`,
);

const badBody = await get("/api/v1/auth/otp/request", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "not-an-email" }),
});
check(
  "a bad sign in request is 400 VALIDATION_FAILED",
  badBody.status === 400 && badBody.json?.error?.code === "VALIDATION_FAILED",
  `status ${badBody.status}`,
);

const noStore = health.headers.get("cache-control");
check("answers are not cached", noStore === "no-store", `cache-control ${noStore}`);

const failed = results.filter((result) => !result.ok);
console.log(
  failed.length === 0
    ? `\nAll ${results.length} checks passed.`
    : `\n${failed.length} of ${results.length} checks FAILED.`,
);
process.exit(failed.length === 0 ? 0 : 1);
