import { http, HttpResponse } from "msw";

// Sample answers for Events and the board (Lost and found, Marketplace), so the screens can be tried without a database
// (NEXT_PUBLIC_API_MOCKING=enabled). The state lives in memory and resets on a reload.

const META = { request_id: "req_mock_community" };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const person = (n: number, name: string) => ({ user_id: id(n), display_name: name });

type MockEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  place: string | null;
  capacity: number | null;
  status: "published" | "cancelled";
  going_count: number;
  going: boolean;
  is_owner: boolean;
  created_at: string;
  author: { user_id: string; display_name: string };
};

const events: MockEvent[] = [
  {
    id: id(401),
    title: "Open mic night",
    description: "Bring a song, a poem or a joke. Five minutes each. Snacks on us.",
    starts_at: inHours(5),
    place: "Main auditorium",
    capacity: 120,
    status: "published",
    going_count: 64,
    going: false,
    is_owner: false,
    created_at: ago(300),
    author: person(11, "Priya Sharma"),
  },
  {
    id: id(402),
    title: "Intro to Git and GitHub, a hands-on talk",
    description: "Bring your laptop. We make a repo together and send our first pull request.",
    starts_at: inHours(30),
    place: "Lab 3",
    capacity: 40,
    status: "published",
    going_count: 40,
    going: false,
    is_owner: false,
    created_at: ago(900),
    author: person(12, "Arjun Reddy"),
  },
  {
    id: id(403),
    title: "Sunday sunrise run",
    description: "Easy 5 km around the campus lake. All paces.",
    starts_at: inHours(60),
    place: "Gate 2",
    capacity: null,
    status: "published",
    going_count: 12,
    going: true,
    is_owner: false,
    created_at: ago(1500),
    author: person(13, "Sana Ali"),
  },
];

type MockPost = {
  id: string;
  board: "lostfound" | "market";
  kind: "lost" | "found" | "sell" | "rent" | "free" | "wanted";
  title: string;
  description: string;
  place: string | null;
  price_inr: number | null;
  status: "open" | "resolved";
  created_at: string;
  is_owner: boolean;
  my_message_count: number;
  author: { user_id: string; display_name: string };
};

const posts: MockPost[] = [
  {
    id: id(501),
    board: "lostfound",
    kind: "lost",
    title: "Black water bottle near the library",
    description: "Steel, with a red sticker on the lid. Left it on the steps around 4 PM.",
    place: "Library steps",
    price_inr: null,
    status: "open",
    created_at: ago(40),
    is_owner: false,
    my_message_count: 0,
    author: person(14, "Meera Kumar"),
  },
  {
    id: id(502),
    board: "lostfound",
    kind: "found",
    title: "Blue ID card holder with a key",
    description: "Found at the canteen table by the window. Tell me the name on the card.",
    place: "Canteen",
    price_inr: null,
    status: "open",
    created_at: ago(200),
    is_owner: false,
    my_message_count: 0,
    author: person(15, "Dev Patel"),
  },
  {
    id: id(503),
    board: "market",
    kind: "sell",
    title: "Engineering Maths, 2nd year, good condition",
    description: "No marks inside. Includes the solved examples booklet.",
    place: "Hostel B",
    price_inr: 350,
    status: "open",
    created_at: ago(90),
    is_owner: false,
    my_message_count: 0,
    author: person(12, "Arjun Reddy"),
  },
  {
    id: id(504),
    board: "market",
    kind: "free",
    title: "Desk lamp, works fine, take it",
    description: "Moving out on Friday. First come, first served.",
    place: "Hostel A",
    price_inr: null,
    status: "open",
    created_at: ago(500),
    is_owner: false,
    my_message_count: 0,
    author: person(13, "Sana Ali"),
  },
  {
    id: id(505),
    board: "market",
    kind: "wanted",
    title: "Looking for a second hand cycle",
    description: "Any gear is fine. Needs working brakes.",
    place: null,
    price_inr: 2500,
    status: "open",
    created_at: ago(700),
    is_owner: false,
    my_message_count: 0,
    author: person(11, "Priya Sharma"),
  },
];

const messages: {
  id: string;
  body: string;
  created_at: string;
  mine: boolean;
  from: { user_id: string; display_name: string };
  with_user: { user_id: string; display_name: string };
}[] = [];

const eventById = (value: unknown) => events.find((item) => item.id === value) ?? events[0]!;
const postById = (value: unknown) => posts.find((item) => item.id === value) ?? posts[0]!;

export const communityHandlers = [
  http.get("*/api/v1/c/:slug/events", ({ request }) => {
    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "true";
    const past = url.searchParams.get("when") === "past";
    const items = past ? [] : events.filter((item) => !mine || item.going);
    return HttpResponse.json({ data: items, meta: META });
  }),
  http.post("*/api/v1/c/:slug/events", async ({ request }) => {
    const body = (await request.json()) as Pick<
      MockEvent,
      "title" | "description" | "starts_at" | "place" | "capacity"
    >;
    const made: MockEvent = {
      id: id(400 + events.length + 1),
      title: body.title,
      description: body.description ?? "",
      starts_at: body.starts_at,
      place: body.place ?? null,
      capacity: body.capacity ?? null,
      status: "published",
      going_count: 1,
      going: true,
      is_owner: true,
      created_at: new Date().toISOString(),
      author: person(10, "You"),
    };
    events.unshift(made);
    return HttpResponse.json({ data: made, meta: META }, { status: 201 });
  }),
  http.get("*/api/v1/c/:slug/events/:id", ({ params }) =>
    HttpResponse.json({ data: eventById(params.id), meta: META }),
  ),
  http.put("*/api/v1/c/:slug/events/:id/rsvp", async ({ params, request }) => {
    const { going } = (await request.json()) as { going: boolean };
    const found = eventById(params.id);
    if (found.going !== going) found.going_count += going ? 1 : -1;
    found.going = going;
    return HttpResponse.json({ data: found, meta: META });
  }),
  http.delete("*/api/v1/c/:slug/events/:id", ({ params }) => {
    const found = eventById(params.id);
    found.status = "cancelled";
    return HttpResponse.json({ data: found, meta: META });
  }),

  http.get("*/api/v1/c/:slug/board", ({ request }) => {
    const url = new URL(request.url);
    const board = url.searchParams.get("board");
    const kind = url.searchParams.get("kind");
    const items = posts.filter((item) => item.board === board && (!kind || item.kind === kind));
    return HttpResponse.json({ data: items, meta: META });
  }),
  http.post("*/api/v1/c/:slug/board", async ({ request }) => {
    const body = (await request.json()) as Pick<
      MockPost,
      "board" | "kind" | "title" | "description" | "place" | "price_inr"
    >;
    const made: MockPost = {
      id: id(500 + posts.length + 1),
      board: body.board,
      kind: body.kind,
      title: body.title,
      description: body.description ?? "",
      place: body.place ?? null,
      price_inr: body.price_inr ?? null,
      status: "open",
      created_at: new Date().toISOString(),
      is_owner: true,
      my_message_count: 0,
      author: person(10, "You"),
    };
    posts.unshift(made);
    return HttpResponse.json({ data: made, meta: META }, { status: 201 });
  }),
  http.get("*/api/v1/c/:slug/board/:id", ({ params }) =>
    HttpResponse.json({ data: postById(params.id), meta: META }),
  ),
  http.post("*/api/v1/c/:slug/board/:id/status", async ({ params, request }) => {
    const { status } = (await request.json()) as { status: "open" | "resolved" };
    const found = postById(params.id);
    found.status = status;
    return HttpResponse.json({ data: found, meta: META });
  }),
  http.delete("*/api/v1/c/:slug/board/:id", () =>
    HttpResponse.json({ data: { deleted: true }, meta: META }),
  ),
  http.get("*/api/v1/c/:slug/board/:id/messages", () =>
    HttpResponse.json({ data: messages, meta: META }),
  ),
  http.post("*/api/v1/c/:slug/board/:id/messages", async ({ request }) => {
    const body = (await request.json()) as { body: string };
    const made = {
      id: id(600 + messages.length + 1),
      body: body.body,
      created_at: new Date().toISOString(),
      mine: true,
      from: person(10, "You"),
      with_user: person(14, "Meera Kumar"),
    };
    messages.push(made);
    return HttpResponse.json({ data: made, meta: META }, { status: 201 });
  }),
];
