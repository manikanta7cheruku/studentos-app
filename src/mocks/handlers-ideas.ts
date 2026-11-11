import { http, HttpResponse } from "msw";

// Sample answers for the Ideas endpoints and college setup, so the screens can be tried without a database
// (NEXT_PUBLIC_API_MOCKING=enabled). The state lives in memory and resets on a reload.

const META = { request_id: "req_mock_ideas" };
const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

type MockIdea = {
  id: string;
  title: string;
  body: string;
  topic: "campus" | "study" | "sports" | "tech" | "food" | "other";
  score: number;
  comment_count: number;
  created_at: string;
  is_owner: boolean;
  my_vote: number;
  author: { user_id: string; display_name: string; headline: string | null };
};

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const ideas: MockIdea[] = [
  {
    id: id(101),
    title: "Every hostel needs a textbook swap shelf",
    body: "Seniors leave with books nobody opens again and juniors buy the same ones new. One shelf per hostel and a QR sheet to log who took what. Who would help set it up?",
    topic: "campus",
    score: 128,
    comment_count: 3,
    created_at: ago(12),
    is_owner: false,
    my_vote: 1,
    author: { user_id: id(11), display_name: "Priya Sharma", headline: "CSE, 3rd year" },
  },
  {
    id: id(102),
    title: "A silent study hall open all night in exam week",
    body: "Proper tables and sockets, no phones. Vote if you would use it.",
    topic: "study",
    score: 86,
    comment_count: 12,
    created_at: ago(64),
    is_owner: false,
    my_vote: 0,
    author: { user_id: id(12), display_name: "Arjun Reddy", headline: "ECE, 2nd year" },
  },
  {
    id: id(103),
    title: "Inter-hostel chess league, one board a week",
    body: "Ten minutes a game, results on a shared ladder. Hostels earn points.",
    topic: "sports",
    score: 64,
    comment_count: 19,
    created_at: ago(190),
    is_owner: false,
    my_vote: 0,
    author: { user_id: id(13), display_name: "Sana Ali", headline: "Design, 2nd year" },
  },
];

type MockComment = {
  id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  is_owner: boolean;
  score?: number;
  my_vote?: number;
  author: { user_id: string; display_name: string };
};

const comments: MockComment[] = [
  {
    id: id(201),
    parent_id: null,
    body: "Our warden already has an empty cupboard. I can take the first shelf.",
    created_at: ago(8),
    is_owner: false,
    score: 4,
    my_vote: 0,
    author: { user_id: id(14), display_name: "Meera Kumar" },
  },
  {
    id: id(202),
    parent_id: id(201),
    body: "Perfect. I will share the sign-up sheet tonight.",
    created_at: ago(5),
    is_owner: false,
    author: { user_id: id(11), display_name: "Priya Sharma" },
  },
  {
    id: id(203),
    parent_id: null,
    body: "Add a rule that books go back at semester end, or it fills with notes nobody wants.",
    created_at: ago(3),
    is_owner: false,
    author: { user_id: id(15), display_name: "Dev Patel" },
  },
];

export const ideaHandlers = [
  http.get("*/api/v1/c/:slug/ideas", () => HttpResponse.json({ data: ideas, meta: META })),
  http.post("*/api/v1/c/:slug/ideas", async ({ request }) => {
    const body = (await request.json()) as Pick<MockIdea, "title" | "body" | "topic">;
    const made: MockIdea = {
      id: id(100 + ideas.length + 1),
      title: body.title,
      body: body.body ?? "",
      topic: body.topic ?? "other",
      score: 1,
      comment_count: 0,
      created_at: new Date().toISOString(),
      is_owner: true,
      my_vote: 1,
      author: { user_id: id(10), display_name: "You", headline: null },
    };
    ideas.unshift(made);
    return HttpResponse.json({ data: made, meta: META }, { status: 201 });
  }),
  http.get("*/api/v1/c/:slug/ideas/:id", ({ params }) => {
    const found = ideas.find((item) => item.id === params.id) ?? ideas[0]!;
    return HttpResponse.json({ data: found, meta: META });
  }),
  http.put("*/api/v1/c/:slug/ideas/:id/vote", async ({ params, request }) => {
    const { value } = (await request.json()) as { value: -1 | 0 | 1 };
    const found = ideas.find((item) => item.id === params.id) ?? ideas[0]!;
    found.score = found.score - found.my_vote + value;
    found.my_vote = value;
    return HttpResponse.json({ data: found, meta: META });
  }),
  http.get("*/api/v1/c/:slug/ideas/:id/comments", () =>
    HttpResponse.json({ data: comments, meta: META }),
  ),
  http.post("*/api/v1/c/:slug/ideas/:id/comments", async ({ request }) => {
    const body = (await request.json()) as { body: string; parent_id?: string | null };
    const made = {
      id: id(300 + comments.length),
      parent_id: body.parent_id ?? null,
      body: body.body,
      created_at: new Date().toISOString(),
      is_owner: true,
      author: { user_id: id(10), display_name: "You" },
    };
    comments.push(made);
    return HttpResponse.json({ data: made, meta: META }, { status: 201 });
  }),
  http.put("*/api/v1/c/:slug/ideas/:id/comments/:commentId/vote", async ({ params, request }) => {
    const { value } = (await request.json()) as { value: -1 | 0 | 1 };
    const found = comments.find((item) => item.id === params.commentId) ?? comments[0]!;
    const mine = (found as { my_vote?: number }).my_vote ?? 0;
    const score = (found as { score?: number }).score ?? 0;
    Object.assign(found, { my_vote: value, score: score - mine + value });
    return HttpResponse.json({ data: found, meta: META });
  }),
  http.post("*/api/v1/colleges/setup", async ({ request }) => {
    const body = (await request.json()) as { code: string; slug: string };
    if (body.code === "00000000") {
      return HttpResponse.json(
        { error: { code: "FORBIDDEN", message: "Not allowed.", request_id: "req_mock_setup" } },
        { status: 403 },
      );
    }
    return HttpResponse.json(
      { data: { college_id: id(900), slug: body.slug }, meta: META },
      { status: 201 },
    );
  }),
];
