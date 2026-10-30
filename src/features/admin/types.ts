export type VerificationStatus = "pending" | "approved" | "rejected";

export type PendingVerification = {
  id: string;
  name: string;
  email: string;
  appliedAt: string; // ISO date
  documentUrl?: string;
  status: VerificationStatus;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "moderator" | "member";
  joinedAt: string; // ISO date
};

export type Invite = {
  id: string;
  code: string;
  createdBy: string;
  createdAt: string; // ISO date
  usedBy?: string;
  usedAt?: string;
  revokedAt?: string;
  status: "active" | "used" | "revoked";
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string; // ISO date
};

export type CollegeSettings = {
  collegeName: string;
  emailDomain: string;
  accentColor: string;
};

export type AdminStats = {
  totalMembers: number;
  pendingVerifications: number;
  activeInvites: number;
  recentActivity: AuditEntry[];
};
