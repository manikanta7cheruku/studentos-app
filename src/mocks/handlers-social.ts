import { http, HttpResponse } from "msw";

// Sample answers for messages, feedback and photos, so the screens can be tried without a database
// (NEXT_PUBLIC_API_MOCKING=enabled). The state lives in memory and resets on a reload.

const META = { request_id: "req_mock_social" };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

const people: Record<string, string> = {
  [id(11)]: "Priya Sharma",
  [id(12)]: "Arjun Reddy",
  [id(13)]: "Sana Ali",
};

type Message = {
  id: string;
  mine: boolean;
  body: string;
  created_at: string;
  opened_at: string | null;
  expires_at: string;
};

// How a conversation stands. Priya's first message is a request waiting for an answer.
const states: Record<string, "pending_in" | "pending_out" | "declined" | "chat"> = {
  [id(11)]: "pending_in",
};
const kindOf = (userId: string) =>
  ({
    pending_in: "request_received",
    pending_out: "request_sent",
    declined: "declined",
    chat: "chat",
  })[states[userId] ?? "chat"];

const threads: Record<string, Message[]> = {
  [id(11)]: [
    {
      id: id(901),
      mine: false,
      body: "Hey, are you coming for football tonight?",
      created_at: ago(20),
      opened_at: null,
      expires_at: inMinutes(60 * 24 * 3),
    },
  ],
  [id(12)]: [
    {
      id: id(902),
      mine: true,
      body: "Can you share the notes?",
      created_at: ago(40),
      opened_at: ago(30),
      expires_at: inMinutes(30),
    },
  ],
};

export const socialHandlers = [
  http.get("*/api/v1/c/:slug/messages", () => {
    const items = Object.entries(threads).map(([userId, messages]) => ({
      user_id: userId,
      display_name: people[userId] ?? "Classmate",
      avatar_url: null,
      unread: messages.filter((m) => !m.mine && !m.opened_at).length,
      last_at: messages[messages.length - 1]!.created_at,
      kind: kindOf(userId),
      message_count: messages.length,
      expires_at:
        states[userId] === "pending_in" || states[userId] === "pending_out"
          ? inMinutes(60 * 24 * 3)
          : null,
      can_request_again_at: states[userId] === "declined" ? inMinutes(60 * 24 * 5) : null,
    }));
    return HttpResponse.json({ data: items, meta: META });
  }),
  http.get("*/api/v1/c/:slug/messages/:userId", ({ params }) => {
    const userId = String(params.userId);
    const messages = threads[userId] ?? [];
    // Opening the conversation starts the 1 hour clock on their messages.
    for (const message of messages) {
      if (!message.mine && !message.opened_at) {
        message.opened_at = new Date().toISOString();
        message.expires_at = inMinutes(60);
      }
    }
    return HttpResponse.json({
      data: {
        other: {
          user_id: userId,
          display_name: people[userId] ?? "Classmate",
          avatar_url: null,
          headline: "Second year, loves football",
          college_name: "Sample College",
          branch: "CSE",
          grad_year: 2028,
        },
        request:
          states[userId] === "pending_in" || states[userId] === "pending_out"
            ? {
                status: "pending",
                i_requested: states[userId] === "pending_out",
                expires_at: inMinutes(60 * 24 * 3),
                can_request_again_at: null,
              }
            : states[userId] === "declined"
              ? {
                  status: "declined",
                  i_requested: true,
                  expires_at: null,
                  can_request_again_at: inMinutes(60 * 24 * 5),
                }
              : null,
        can_message: true,
        messages,
      },
      meta: META,
    });
  }),
  http.post("*/api/v1/c/:slug/messages/:userId", async ({ params, request }) => {
    const userId = String(params.userId);
    const { body } = (await request.json()) as { body: string };
    const made: Message = {
      id: id(950 + (threads[userId]?.length ?? 0)),
      mine: true,
      body,
      created_at: new Date().toISOString(),
      opened_at: null,
      expires_at: inMinutes(60 * 24 * 3),
    };
    const first = !threads[userId];
    threads[userId] = [...(threads[userId] ?? []), made];
    if (first) states[userId] = "pending_out";
    else if (states[userId] === "pending_in") states[userId] = "chat";
    return HttpResponse.json(
      {
        data: {
          id: made.id,
          created_at: made.created_at,
          expires_at: made.expires_at,
          request: first,
        },
        meta: META,
      },
      { status: 201 },
    );
  }),
  http.post("*/api/v1/c/:slug/messages/:userId/decline", ({ params }) => {
    const userId = String(params.userId);
    delete threads[userId];
    delete states[userId];
    return HttpResponse.json({ data: { status: "declined" }, meta: META });
  }),
  http.get("*/api/v1/c/:slug/network/suggestions", () =>
    HttpResponse.json({
      data: [
        {
          user_id: id(13),
          display_name: "Sana Ali",
          headline: "Design and cricket",
          avatar_url: null,
          college_name: "Sample College",
          branch: "ECE",
          grad_year: 2027,
          shared_interests: ["Cricket", "Design"],
          mutual: 2,
        },
        {
          user_id: id(14),
          display_name: "Kiran Patel",
          headline: null,
          avatar_url: null,
          college_name: "Sample College",
          branch: "CSE",
          grad_year: 2028,
          shared_interests: [],
          mutual: 0,
        },
      ],
      meta: META,
    }),
  ),
  http.get("*/api/v1/c/:slug/network/connections", () =>
    HttpResponse.json({
      data: [
        {
          user_id: id(12),
          display_name: "Arjun Reddy",
          headline: "Robotics club",
          avatar_url: null,
          college_name: "Sample College",
          branch: "ECE",
          grad_year: 2027,
          place: "Hyderabad",
        },
      ],
      meta: META,
    }),
  ),
  http.get("*/api/v1/me/network", () =>
    HttpResponse.json({
      data: { connections: 4, requests_sent: 1, requests_received: 1 },
      meta: META,
    }),
  ),
  http.post("*/api/v1/c/:slug/messages/:userId/report", () =>
    HttpResponse.json(
      { data: { id: id(990), status: "open", created_at: new Date().toISOString() }, meta: META },
      { status: 201 },
    ),
  ),
  http.put("*/api/v1/me/blocks/:userId", () =>
    HttpResponse.json({ data: { blocked: true }, meta: META }),
  ),
  http.delete("*/api/v1/me/blocks/:userId", () =>
    HttpResponse.json({ data: { blocked: false }, meta: META }),
  ),
  http.get("*/api/v1/me/blocks", () => HttpResponse.json({ data: [], meta: META })),
  http.post("*/api/v1/me/feedback", () =>
    HttpResponse.json(
      { data: { id: id(980), created_at: new Date().toISOString() }, meta: META },
      { status: 201 },
    ),
  ),
];
