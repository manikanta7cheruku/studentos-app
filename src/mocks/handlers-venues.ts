import { http, HttpResponse } from "msw";

// Sample answers for Turf and courts, so the screens can be tried without a database (NEXT_PUBLIC_API_MOCKING=enabled).
// The first venue is "yours" (you are its manager), so you can try confirming and declining. State lives in memory.

const META = { request_id: "req_mock_venues" };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const dayKey = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

type MockVenue = {
  id: string;
  name: string;
  description: string;
  sports: string[];
  area: string | null;
  price_inr_per_hour: number | null;
  open_hour: number;
  close_hour: number;
  status: "active" | "hidden";
  created_at: string;
  manager: string;
  is_manager: boolean;
  pending_count: number;
};

type MockBooking = {
  id: string;
  venue_id: string;
  venue_name: string;
  play_date: string;
  start_hour: number;
  hours: number;
  players: number | null;
  note: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  manager_note: string | null;
  created_at: string;
  requester: { user_id: string; display_name: string };
};

const venues: MockVenue[] = [
  {
    id: id(701),
    name: "Greenfield Turf",
    description: "Five a side with floodlights and a small canteen. Bring your own ball.",
    sports: ["football", "cricket"],
    area: "Near gate 2",
    price_inr_per_hour: 800,
    open_hour: 6,
    close_hour: 23,
    status: "active",
    created_at: ago(5000),
    manager: "You",
    is_manager: true,
    pending_count: 1,
  },
  {
    id: id(702),
    name: "Smash Arena",
    description: "Four wooden badminton courts, rackets on rent.",
    sports: ["badminton"],
    area: "Sports block, first floor",
    price_inr_per_hour: 300,
    open_hour: 7,
    close_hour: 22,
    status: "active",
    created_at: ago(4000),
    manager: "Priya Sharma",
    is_manager: false,
    pending_count: 0,
  },
  {
    id: id(703),
    name: "Lakeside Court",
    description: "An open basketball court by the lake.",
    sports: ["basketball", "volleyball"],
    area: null,
    price_inr_per_hour: null,
    open_hour: 6,
    close_hour: 20,
    status: "active",
    created_at: ago(3000),
    manager: "Arjun Reddy",
    is_manager: false,
    pending_count: 0,
  },
];

const bookings: MockBooking[] = [
  {
    id: id(801),
    venue_id: id(701),
    venue_name: "Greenfield Turf",
    play_date: dayKey(1),
    start_hour: 18,
    hours: 2,
    players: 10,
    note: "Friday football with the hostel team",
    status: "pending",
    manager_note: null,
    created_at: ago(90),
    requester: { user_id: id(11), display_name: "Sana Ali" },
  },
  {
    id: id(802),
    venue_id: id(701),
    venue_name: "Greenfield Turf",
    play_date: dayKey(2),
    start_hour: 7,
    hours: 1,
    players: null,
    note: "",
    status: "confirmed",
    manager_note: "See you at gate 2",
    created_at: ago(600),
    requester: { user_id: id(12), display_name: "Rohan Mehta" },
  },
];

function venueById(raw: string | readonly string[] | undefined): MockVenue {
  const key = Array.isArray(raw) ? raw[0] : raw;
  return venues.find((item) => item.id === key) ?? venues[0]!;
}

function refresh(venue: MockVenue) {
  venue.pending_count = bookings.filter(
    (b) => b.venue_id === venue.id && b.status === "pending",
  ).length;
  return venue;
}

export const venueHandlers = [
  http.get("*/api/v1/c/:slug/venues", ({ request }) => {
    const sport = new URL(request.url).searchParams.get("sport");
    const items = venues
      .filter((item) => item.status === "active" && (!sport || item.sports.includes(sport)))
      .map(refresh);
    return HttpResponse.json({ data: items, meta: META });
  }),
  http.post("*/api/v1/c/:slug/venues", async ({ request }) => {
    const body = (await request.json()) as Partial<MockVenue>;
    const made: MockVenue = {
      id: id(700 + venues.length + 1),
      name: body.name ?? "New venue",
      description: body.description ?? "",
      sports: body.sports ?? ["football"],
      area: body.area ?? null,
      price_inr_per_hour: body.price_inr_per_hour ?? null,
      open_hour: body.open_hour ?? 6,
      close_hour: body.close_hour ?? 23,
      status: "active",
      created_at: new Date().toISOString(),
      manager: "You",
      is_manager: true,
      pending_count: 0,
    };
    venues.unshift(made);
    return HttpResponse.json({ data: made, meta: META }, { status: 201 });
  }),
  http.get("*/api/v1/c/:slug/venues/:id", ({ params }) =>
    HttpResponse.json({ data: refresh(venueById(params.id)), meta: META }),
  ),
  http.delete("*/api/v1/c/:slug/venues/:id", ({ params }) => {
    const found = venueById(params.id);
    found.status = "hidden";
    return HttpResponse.json({ data: { id: found.id, status: "hidden" }, meta: META });
  }),
  http.get("*/api/v1/c/:slug/venues/:id/slots", ({ params, request }) => {
    const found = venueById(params.id);
    const date = new URL(request.url).searchParams.get("date") ?? dayKey(0);
    const slots = [];
    for (let hour = found.open_hour; hour < found.close_hour; hour += 1) {
      const covering = bookings.filter(
        (b) =>
          b.venue_id === found.id &&
          b.play_date === date &&
          hour >= b.start_hour &&
          hour < b.start_hour + b.hours,
      );
      slots.push({
        hour,
        state: covering.some((b) => b.status === "confirmed") ? "booked" : "free",
        requests: covering.filter((b) => b.status === "pending").length,
        mine: covering.some(
          (b) => b.requester.display_name === "You" && ["pending", "confirmed"].includes(b.status),
        ),
      });
    }
    return HttpResponse.json({ data: slots, meta: META });
  }),
  http.post("*/api/v1/c/:slug/venues/:id/bookings", async ({ params, request }) => {
    const found = venueById(params.id);
    const body = (await request.json()) as {
      play_date: string;
      start_hour: number;
      hours: number;
      players?: number;
      note?: string;
    };
    const made: MockBooking = {
      id: id(800 + bookings.length + 1),
      venue_id: found.id,
      venue_name: found.name,
      play_date: body.play_date,
      start_hour: body.start_hour,
      hours: body.hours,
      players: body.players ?? null,
      note: body.note ?? "",
      status: "pending",
      manager_note: null,
      created_at: new Date().toISOString(),
      requester: { user_id: id(10), display_name: "You" },
    };
    bookings.unshift(made);
    return HttpResponse.json({ data: made, meta: META }, { status: 201 });
  }),
  http.get("*/api/v1/c/:slug/venues/:id/bookings", ({ params }) => {
    const found = venueById(params.id);
    return HttpResponse.json({
      data: bookings.filter((b) => b.venue_id === found.id),
      meta: META,
    });
  }),
  http.get("*/api/v1/c/:slug/me/bookings", () =>
    HttpResponse.json({
      data: bookings.filter((b) => b.requester.display_name === "You"),
      meta: META,
    }),
  ),
  http.post("*/api/v1/c/:slug/bookings/:id/decision", async ({ params, request }) => {
    const body = (await request.json()) as { decision: "confirmed" | "declined"; note?: string };
    const found = bookings.find((b) => b.id === params.id) ?? bookings[0]!;
    found.status = body.decision;
    found.manager_note = body.note ?? null;
    return HttpResponse.json({ data: found, meta: META });
  }),
  http.delete("*/api/v1/c/:slug/bookings/:id", ({ params }) => {
    const found = bookings.find((b) => b.id === params.id) ?? bookings[0]!;
    found.status = "cancelled";
    return HttpResponse.json({ data: found, meta: META });
  }),
];
