import { http, HttpResponse } from "msw";

// Sample answers for the People directory, so the screen can be tried without a database (NEXT_PUBLIC_API_MOCKING=enabled).

const META = { request_id: "req_mock_people" };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const people = [
  {
    user_id: id(11),
    display_name: "Priya Sharma",
    handle: "priya_s",
    headline: "Design, 2nd year",
    bio: "I like small design projects and weekend football.",
    avatar_url: null,
    interests: ["design", "football", "photography"],
    career_goal: "Product designer",
    program: "B.Des",
    grad_year: 2028,
    skills: [
      { name: "Figma", level: 4 },
      { name: "Illustration", level: 3 },
    ],
  },
  {
    user_id: id(12),
    display_name: "Arjun Reddy",
    handle: "arjun",
    headline: "CSE, building a bus tracker",
    bio: "Backend and a bit of hardware.",
    avatar_url: null,
    interests: ["robotics", "open source"],
    career_goal: "Backend engineer",
    program: "B.Tech CSE",
    grad_year: 2027,
    skills: [
      { name: "Python", level: 4 },
      { name: "SQL", level: 3 },
    ],
  },
  {
    user_id: id(13),
    display_name: "Sana Ali",
    handle: null,
    headline: "Runner and designer",
    bio: null,
    avatar_url: null,
    interests: ["running", "design"],
    career_goal: null,
    program: "B.Des",
    grad_year: 2028,
    skills: [{ name: "Figma", level: 3 }],
  },
  {
    user_id: id(14),
    display_name: "Meera Kumar",
    handle: "meera_k",
    headline: null,
    bio: null,
    avatar_url: null,
    interests: ["books", "study groups", "chess"],
    career_goal: null,
    program: null,
    grad_year: null,
    skills: [],
  },
  {
    user_id: id(15),
    display_name: "Dev Patel",
    handle: "dev",
    headline: "Cricket captain, 3rd year",
    bio: "Always looking for one more player.",
    avatar_url: null,
    interests: ["cricket", "fitness"],
    career_goal: null,
    program: "B.Com",
    grad_year: 2026,
    skills: [{ name: "Public speaking", level: 4 }],
  },
];

export const peopleHandlers = [
  http.get("*/api/v1/c/:slug/people", ({ request }) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
    const items = people
      .filter(
        (person) =>
          !q ||
          person.display_name.toLowerCase().includes(q) ||
          person.interests.some((interest) => interest.toLowerCase().includes(q)),
      )
      .map(({ user_id, display_name, handle, headline, avatar_url, interests }) => ({
        user_id,
        display_name,
        handle,
        headline,
        avatar_url,
        interests,
      }));
    return HttpResponse.json({ data: items, meta: META });
  }),
  http.get("*/api/v1/c/:slug/people/:userId", ({ params }) => {
    const found = people.find((person) => person.user_id === params.userId) ?? people[0]!;
    return HttpResponse.json({ data: { ...found, is_self: false }, meta: META });
  }),
];
