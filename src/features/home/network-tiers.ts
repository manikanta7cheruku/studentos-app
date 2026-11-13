// How strong a person's network is, from how many people they are connected to. Rewards for the tiers come after launch.
export const NETWORK_TIERS = [
  { at: 3, name: "Starter" },
  { at: 6, name: "Connector" },
  { at: 10, name: "Networker" },
  { at: 20, name: "Well known" },
  { at: 35, name: "Campus voice" },
  { at: 50, name: "Hub" },
  { at: 75, name: "Pillar" },
  { at: 100, name: "Legend" },
] as const;

export type NetworkProgress = {
  /** The tier reached, or null before the first one. */
  tier: (typeof NETWORK_TIERS)[number] | null;
  /** The tier to reach next, or null at the top. */
  next: (typeof NETWORK_TIERS)[number] | null;
  /** 0 to 1 towards the next tier. */
  fraction: number;
  /** People still to meet for the next tier. */
  left: number;
};

export function networkProgress(connections: number): NetworkProgress {
  const n = Math.max(0, Math.floor(connections));
  let tier: NetworkProgress["tier"] = null;
  for (const t of NETWORK_TIERS) if (n >= t.at) tier = t;
  const next = NETWORK_TIERS.find((t) => n < t.at) ?? null;
  const from = tier?.at ?? 0;
  return {
    tier,
    next,
    fraction: next ? (n - from) / (next.at - from) : 1,
    left: next ? next.at - n : 0,
  };
}

/** Friendly openers for a first message. Short, warm, and easy to edit. */
export function openers(first: string, shared: string[]): string[] {
  const list = [
    `Hi ${first}, I am in your college too. Nice to meet you!`,
    `Hey ${first}, would be great to connect and share notes sometime.`,
  ];
  if (shared[0]) list.unshift(`Hi ${first}, I saw we both like ${shared[0]}. Want to chat?`);
  return list.slice(0, 3);
}
