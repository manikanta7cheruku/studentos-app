import type {
  AdminStats,
  AuditEntry,
  CollegeSettings,
  Invite,
  Member,
  PendingVerification,
} from "./types";

// ──────────────────────────────────────────────
// Fake data — R2 will swap this with real API calls.
// All names, emails and dates are obviously fake.
// ──────────────────────────────────────────────

export const samplePendingVerifications: PendingVerification[] = [
  {
    id: "pv-1",
    name: "Priya Sharma",
    email: "student1@example.edu",
    appliedAt: "2026-10-28T10:30:00Z",
    status: "pending",
  },
  {
    id: "pv-2",
    name: "Arjun Patel",
    email: "student2@example.edu",
    appliedAt: "2026-10-27T14:15:00Z",
    status: "pending",
  },
  {
    id: "pv-3",
    name: "Sneha Reddy",
    email: "student3@example.edu",
    appliedAt: "2026-10-26T09:45:00Z",
    status: "pending",
  },
];

export const sampleMembers: Member[] = [
  {
    id: "m-1",
    name: "Vikram Singh",
    email: "admin1@example.edu",
    role: "admin",
    joinedAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "m-2",
    name: "Ananya Desai",
    email: "mod1@example.edu",
    role: "moderator",
    joinedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "m-3",
    name: "Rahul Kumar",
    email: "student4@example.edu",
    role: "member",
    joinedAt: "2026-09-10T00:00:00Z",
  },
  {
    id: "m-4",
    name: "Meera Joshi",
    email: "student5@example.edu",
    role: "member",
    joinedAt: "2026-09-20T00:00:00Z",
  },
  {
    id: "m-5",
    name: "Karthik Nair",
    email: "student6@example.edu",
    role: "member",
    joinedAt: "2026-10-01T00:00:00Z",
  },
];

export const sampleInvites: Invite[] = [
  {
    id: "inv-1",
    code: "WELCOME-2026",
    createdBy: "Vikram Singh",
    createdAt: "2026-10-01T12:00:00Z",
    status: "active",
  },
  {
    id: "inv-2",
    code: "HACKATHON-FALL",
    createdBy: "Vikram Singh",
    createdAt: "2026-09-15T12:00:00Z",
    usedBy: "Rahul Kumar",
    usedAt: "2026-09-16T08:00:00Z",
    status: "used",
  },
  {
    id: "inv-3",
    code: "OLD-BATCH",
    createdBy: "Ananya Desai",
    createdAt: "2026-08-01T12:00:00Z",
    revokedAt: "2026-08-10T12:00:00Z",
    status: "revoked",
  },
];

export const sampleAuditLog: AuditEntry[] = [
  {
    id: "a-1",
    actor: "Vikram Singh",
    action: "Approved verification",
    target: "Rahul Kumar",
    timestamp: "2026-10-29T16:00:00Z",
  },
  {
    id: "a-2",
    actor: "Vikram Singh",
    action: "Created invite code",
    target: "WELCOME-2026",
    timestamp: "2026-10-28T12:00:00Z",
  },
  {
    id: "a-3",
    actor: "Ananya Desai",
    action: "Rejected verification",
    target: "student7@example.edu",
    timestamp: "2026-10-27T11:30:00Z",
  },
  {
    id: "a-4",
    actor: "Vikram Singh",
    action: "Removed member",
    target: "student8@example.edu",
    timestamp: "2026-10-26T09:15:00Z",
  },
  {
    id: "a-5",
    actor: "Vikram Singh",
    action: "Updated college settings",
    target: "Email domain",
    timestamp: "2026-10-25T14:00:00Z",
  },
];

export const sampleSettings: CollegeSettings = {
  collegeName: "Example Engineering College",
  emailDomain: "example.edu",
  accentColor: "#2340C8",
};

export const sampleStats: AdminStats = {
  totalMembers: 5,
  pendingVerifications: 3,
  activeInvites: 1,
  recentActivity: sampleAuditLog.slice(0, 3),
};
