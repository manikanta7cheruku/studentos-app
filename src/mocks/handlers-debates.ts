import { http, HttpResponse } from "msw";

// Sample answers for debates, following, invite links and college name suggestions, so the screens can be tried without a
// database (NEXT_PUBLIC_API_MOCKING=enabled). The state lives in memory and resets on a reload.

const META = { request_id: "req_mock_debates" };
const id = (n: number) => `00000000-0000-4000-8000-${String(n + 500).padStart(12, "0")}`;
const person = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

type Side = 0 | 1;
type MockDebate = {
  id: string;
  title: string;
  body: string;
  topic: string;
  side_a: string;
  side_b: string;
  created_at: string;
  ends_at: string;
  a_count: number;
  b_count: number;
  my_side: Side | null;
  argument_count: number;
  author: { user_id: string; display_name: string };
};
type MockArgument = {
  id: string;
  debate: string;
  side: Side;
  body: string;
  created_at: string;
  score: number;
  i_upvoted: boolean;
  is_anonymous: boolean;
  author: { user_id: string; display_name: string };
};

const debates: MockDebate[] = [
  {
    id: id(1),
    title: "Is the book always better than the movie?",
    body: "Harry Potter, Dune, any adaptation you like. Make your case.",
    topic: "movies",
    side_a: "Book",
    side_b: "Movie",
    created_at: ago(3),
    ends_at: hours(21),
    a_count: 14,
    b_count: 9,
    my_side: null,
    argument_count: 3,
    author: { user_id: person(12), display_name: "Arjun Reddy" },
  },
  {
    id: id(2),
    title: "Should attendance be optional in college?",
    body: "",
    topic: "campus",
    side_a: "Yes",
    side_b: "No",
    created_at: ago(1),
    ends_at: hours(5),
    a_count: 31,
    b_count: 22,
    my_side: null,
    argument_count: 1,
    author: { user_id: person(11), display_name: "Priya Sharma" },
  },
  {
    id: id(3),
    title: "Cricket or football on campus?",
    body: "",
    topic: "sports",
    side_a: "Cricket",
    side_b: "Football",
    created_at: ago(30),
    ends_at: ago(6),
    a_count: 12,
    b_count: 19,
    my_side: 1,
    argument_count: 1,
    author: { user_id: person(13), display_name: "Sana Ali" },
  },
];

const argumentsList: MockArgument[] = [
  {
    id: id(11),
    debate: id(1),
    side: 0,
    body: "A book lets you build the whole world in your head. A movie hands you someone else's version, and it always cuts the best subplots.",
    created_at: ago(2),
    score: 6,
    i_upvoted: false,
    is_anonymous: false,
    author: { user_id: person(11), display_name: "Priya Sharma" },
  },
  {
    id: id(12),
    debate: id(1),
    side: 1,
    body: "Most people will never read a 600 page book, but they will watch a great film. For reach and emotion, the movie wins.",
    created_at: ago(1),
    score: 3,
    i_upvoted: false,
    is_anonymous: true,
    author: { user_id: "00000000-0000-0000-0000-000000000000", display_name: "Anonymous otter" },
  },
  {
    id: id(13),
    debate: id(1),
    side: 1,
    body: "Music, acting and editing do things a page cannot. The Lord of the Rings films made me finally pick up the books.",
    created_at: ago(1),
    score: 1,
    i_upvoted: false,
    is_anonymous: false,
    author: { user_id: person(12), display_name: "Arjun Reddy" },
  },
  {
    id: id(14),
    debate: id(3),
    side: 1,
    body: "Football needs one ball and no booking. Anyone can join in five minutes.",
    created_at: ago(28),
    score: 4,
    i_upvoted: false,
    is_anonymous: false,
    author: { user_id: person(13), display_name: "Sana Ali" },
  },
];

const shape = (debate: MockDebate) => ({
  ...debate,
  ended: new Date(debate.ends_at).getTime() <= Date.now(),
  is_owner: debate.author.display_name === "You",
});
const argumentShape = (item: MockArgument) => ({
  id: item.id,
  side: item.side,
  body: item.body,
  created_at: item.created_at,
  is_owner: item.author.display_name === "You",
  score: item.score,
  i_upvoted: item.i_upvoted,
  is_anonymous: item.is_anonymous,
  by_debate_author: false,
  author: item.author,
});
const notFound = () =>
  HttpResponse.json(
    { error: { code: "NOT_FOUND", message: "Not found.", request_id: "req_mock_debates" } },
    { status: 404 },
  );
const conflict = () =>
  HttpResponse.json(
    {
      error: {
        code: "CONFLICT",
        message: "This debate has closed.",
        request_id: "req_mock_debates",
      },
    },
    { status: 409 },
  );

let following = false;

export const debateHandlers = [
  http.get("*/api/v1/c/:slug/debates", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "live";
    const topic = url.searchParams.get("topic");
    const items = debates
      .map(shape)
      .filter((debate) =>
        status === "all" ? true : status === "live" ? !debate.ended : debate.ended,
      )
      .filter((debate) => !topic || debate.topic === topic);
    return HttpResponse.json({ data: items, meta: { ...META, next_cursor: null } });
  }),
  http.post("*/api/v1/c/:slug/debates", async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      body?: string;
      topic?: string;
      side_a: string;
      side_b: string;
      hours: number;
    };
    const made: MockDebate = {
      id: id(100 + debates.length),
      title: body.title,
      body: body.body ?? "",
      topic: body.topic ?? "other",
      side_a: body.side_a,
      side_b: body.side_b,
      created_at: new Date().toISOString(),
      ends_at: hours(body.hours),
      a_count: 0,
      b_count: 0,
      my_side: null,
      argument_count: 0,
      author: { user_id: person(10), display_name: "You" },
    };
    debates.unshift(made);
    return HttpResponse.json({ data: shape(made), meta: META }, { status: 201 });
  }),
  http.get("*/api/v1/c/:slug/debates/:id", ({ params }) => {
    const found = debates.find((debate) => debate.id === params.id);
    return found ? HttpResponse.json({ data: shape(found), meta: META }) : notFound();
  }),
  http.delete("*/api/v1/c/:slug/debates/:id", ({ params }) => {
    const at = debates.findIndex((debate) => debate.id === params.id);
    if (at < 0) return notFound();
    debates.splice(at, 1);
    return HttpResponse.json({ data: { deleted: true }, meta: META });
  }),
  http.put("*/api/v1/c/:slug/debates/:id/side", async ({ params, request }) => {
    const found = debates.find((debate) => debate.id === params.id);
    if (!found) return notFound();
    if (shape(found).ended) return conflict();
    const { side } = (await request.json()) as { side: Side };
    if (found.my_side === 0) found.a_count -= 1;
    if (found.my_side === 1) found.b_count -= 1;
    found.my_side = side;
    if (side === 0) found.a_count += 1;
    else found.b_count += 1;
    return HttpResponse.json({ data: shape(found), meta: META });
  }),
  http.get("*/api/v1/c/:slug/debates/:id/arguments", ({ params }) =>
    HttpResponse.json({
      data: argumentsList
        .filter((item) => item.debate === params.id)
        .sort((a, b) => b.score - a.score)
        .map(argumentShape),
      meta: META,
    }),
  ),
  http.post("*/api/v1/c/:slug/debates/:id/arguments", async ({ params, request }) => {
    const found = debates.find((debate) => debate.id === params.id);
    if (!found) return notFound();
    if (shape(found).ended) return conflict();
    if (found.my_side === null)
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "Pick a side first.",
            request_id: "req_mock",
          },
        },
        { status: 400 },
      );
    const body = (await request.json()) as { body: string; anonymous?: boolean };
    const made: MockArgument = {
      id: id(200 + argumentsList.length),
      debate: found.id,
      side: found.my_side,
      body: body.body,
      created_at: new Date().toISOString(),
      score: 0,
      i_upvoted: false,
      is_anonymous: Boolean(body.anonymous),
      author: body.anonymous
        ? { user_id: "00000000-0000-0000-0000-000000000000", display_name: "Anonymous fox" }
        : { user_id: person(10), display_name: "You" },
    };
    argumentsList.push(made);
    found.argument_count += 1;
    return HttpResponse.json({ data: argumentShape(made), meta: META }, { status: 201 });
  }),
  http.put("*/api/v1/c/:slug/debates/:id/arguments/:argId/vote", async ({ params, request }) => {
    const found = argumentsList.find((item) => item.id === params.argId);
    if (!found) return notFound();
    const { value } = (await request.json()) as { value: 0 | 1 };
    if (value === 1 && !found.i_upvoted) found.score += 1;
    if (value === 0 && found.i_upvoted) found.score -= 1;
    found.i_upvoted = value === 1;
    return HttpResponse.json({ data: argumentShape(found), meta: META });
  }),
  http.delete("*/api/v1/c/:slug/debates/:id/arguments/:argId", ({ params }) => {
    const at = argumentsList.findIndex((item) => item.id === params.argId);
    if (at < 0) return notFound();
    argumentsList.splice(at, 1);
    return HttpResponse.json({ data: { deleted: true }, meta: META });
  }),

  // Following, invite links and college name suggestions
  http.put("*/api/v1/me/follows/:userId", () => {
    following = true;
    return HttpResponse.json({ data: { followers: 12, following: 9, i_follow: true }, meta: META });
  }),
  http.delete("*/api/v1/me/follows/:userId", () => {
    following = false;
    return HttpResponse.json({
      data: { followers: 12, following: 9, i_follow: following },
      meta: META,
    });
  }),
  http.get("*/api/v1/me/connections", ({ request }) => {
    const kind = new URL(request.url).searchParams.get("kind") ?? "followers";
    const names =
      kind === "following"
        ? ["Priya Sharma", "Arjun Reddy"]
        : ["Sana Ali", "Meera Kumar", "Arjun Reddy"];
    return HttpResponse.json({
      data: names.map((name, index) => ({
        user_id: person(11 + index),
        display_name: name,
        headline: "Alpha College",
        avatar_url: null,
        since: ago(24 * (index + 1)),
      })),
      meta: META,
    });
  }),
  http.get("*/api/v1/me/invite", () =>
    HttpResponse.json({ data: { code: "ab12cd34", invited: 2 }, meta: META }),
  ),
  http.post("*/api/v1/me/referral", () =>
    HttpResponse.json({ data: { applied: false }, meta: META }),
  ),
  http.get("*/api/v1/colleges/suggest", () =>
    HttpResponse.json({
      data: ["Alpha College", "Alpha Institute of Technology"],
      meta: META,
    }),
  ),
];
