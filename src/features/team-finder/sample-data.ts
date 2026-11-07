import type { TeamPost } from "./types";

export const sampleTeamPosts: TeamPost[] = [
  {
    id: "post-1",
    kind: "hackathon",
    title: "Smart Campus Energy Monitor",
    description:
      "Building an IoT dashboard that tracks building electricity use in real time to help the campus reduce energy waste during hack night.",
    deadline: "2026-11-20T18:00:00Z",
    status: "open",
    roles: [
      {
        id: "role-1a",
        role_name: "Frontend Developer",
        slots: 2,
        filled: 1,
        skills: ["React", "TypeScript", "Tailwind CSS"],
      },
      {
        id: "role-1b",
        role_name: "Hardware Engineer",
        slots: 1,
        filled: 1,
        skills: ["Arduino", "Circuit Design", "MQTT"],
      },
      {
        id: "role-1c",
        role_name: "Data Analyst",
        slots: 1,
        filled: 0,
        skills: ["Python", "Pandas", "Data Visualization"],
      },
    ],
    created_at: "2026-11-01T10:00:00Z",
    external_link: "https://example.org/hackathon-guidelines",
  },
  {
    id: "post-2",
    kind: "project",
    title: "Library Book Exchange App",
    description:
      "A peer-to-peer textbook swap platform for students to share course readings at the start of each semester without high retail costs.",
    deadline: "2026-12-01T23:59:59Z",
    status: "closed",
    roles: [
      {
        id: "role-2a",
        role_name: "Backend Engineer",
        slots: 1,
        filled: 1,
        skills: ["Node.js", "PostgreSQL", "REST APIs"],
      },
      {
        id: "role-2b",
        role_name: "UI Designer",
        slots: 1,
        filled: 0,
        skills: ["Figma", "User Research", "Wireframing"],
      },
    ],
    created_at: "2026-10-25T14:30:00Z",
  },
  {
    id: "post-3",
    kind: "competition",
    title: "Autonomous Rover Challenge",
    description:
      "Inter-college robotics design competition team focused on terrain mapping, sensor fusion, and obstacle avoidance algorithms.",
    deadline: "2026-10-15T12:00:00Z",
    status: "expired",
    roles: [
      {
        id: "role-3a",
        role_name: "Robotics Programmer",
        slots: 2,
        filled: 1,
        skills: ["C++", "ROS", "Computer Vision"],
      },
      {
        id: "role-3b",
        role_name: "Mechanical Fabricator",
        slots: 1,
        filled: 1,
        skills: ["SolidWorks", "3D Printing", "CAD"],
      },
    ],
    created_at: "2026-10-01T08:00:00Z",
  },
  {
    id: "post-4",
    kind: "startup",
    title: "Peer Tutoring Marketplace",
    description:
      "Connecting verified senior students with juniors for affordable 1-on-1 tutoring sessions in engineering math and core programming.",
    deadline: null,
    status: "open",
    roles: [
      {
        id: "role-4a",
        role_name: "Mobile App Developer",
        slots: 2,
        filled: 0,
        skills: ["React Native", "TypeScript", "Mobile UI"],
      },
      {
        id: "role-4b",
        role_name: "Growth & Community Lead",
        slots: 1,
        filled: 0,
        skills: ["Campus Outreach", "Event Planning", "Content"],
      },
    ],
    created_at: "2026-11-02T16:00:00Z",
    external_link: "https://example.org/tutoring-pitch",
  },
  {
    id: "post-5",
    kind: "competition",
    title: "Solar Car Telemetry Dashboard",
    description:
      "Real-time battery and motor telemetry system for the annual national student solar car endurance challenge.",
    deadline: "2026-11-30T17:00:00Z",
    status: "filled",
    roles: [
      {
        id: "role-5a",
        role_name: "Telemetry Engineer",
        slots: 2,
        filled: 2,
        skills: ["Embedded C", "CAN Bus", "Telemetry"],
      },
    ],
    created_at: "2026-10-28T09:15:00Z",
  },
];
