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
    tech_interests: [],
    college_name: "Alpha College",
    branch: "CSE",
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
    tech_interests: [],
    college_name: "Alpha College",
    branch: "CSE",
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
    tech_interests: [],
    college_name: "Alpha College",
    branch: "CSE",
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
    tech_interests: [],
    college_name: "Alpha College",
    branch: "CSE",
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
    tech_interests: [],
    college_name: "Alpha College",
    branch: "CSE",
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
      .map((person) => ({
        user_id: person.user_id,
        display_name: person.display_name,
        handle: person.handle,
        headline: person.headline,
        avatar_url: person.avatar_url,
        interests: person.interests,
        tech_interests: person.tech_interests,
        college_name: person.college_name,
        branch: person.branch,
        grad_year: person.grad_year,
      }));
    return HttpResponse.json({ data: items, meta: META });
  }),
  http.get("*/api/v1/c/:slug/people/:userId", ({ params }) => {
    const found = people.find((person) => person.user_id === params.userId) ?? people[0]!;
    const index = people.indexOf(found);
    // A different amount of standing for each sample person, so the panel can be seen at several levels.
    const contributions = [
      {
        buzz: 30,
        replies: 120,
        plans: 6,
        events: 3,
        upvotes: 310,
        debates: 22,
        invited: 6,
        crowd_debates: 3,
        filled_plans: 3,
        big_events: 2,
        member_days: 150,
      },
      {
        buzz: 4,
        replies: 9,
        plans: 1,
        events: 0,
        upvotes: 12,
        debates: 2,
        invited: 0,
        crowd_debates: 0,
        filled_plans: 0,
        big_events: 0,
        member_days: 20,
      },
      {
        buzz: 0,
        replies: 0,
        plans: 0,
        events: 0,
        upvotes: 0,
        debates: 0,
        invited: 0,
        crowd_debates: 0,
        filled_plans: 0,
        big_events: 0,
        member_days: 3,
      },
    ][index % 3];
    return HttpResponse.json({
      data: { ...found, is_self: false, i_follow: false, contributions },
      meta: META,
    });
  }),
];
