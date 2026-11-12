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
        other: { user_id: userId, display_name: people[userId] ?? "Classmate", avatar_url: null },
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
    threads[userId] = [...(threads[userId] ?? []), made];
    return HttpResponse.json(
      {
        data: { id: made.id, created_at: made.created_at, expires_at: made.expires_at },
        meta: META,
      },
      { status: 201 },
    );
  }),
  http.post("*/api/v1/c/:slug/messages/:userId/report", () =>
    HttpResponse.json(
      { data: { id: id(990), status: "open", created_at: new Date().toISOString() }, meta: META },
      { status: 201 },
    ),
  ),
  http.put("*/api/v1/me/blocks/:userId", () =>
    HttpResponse.json({ data: { blocked: true }, meta: META }),
  ),
  http.post("*/api/v1/me/feedback", () =>
    HttpResponse.json(
      { data: { id: id(980), created_at: new Date().toISOString() }, meta: META },
      { status: 201 },
    ),
  ),
];
