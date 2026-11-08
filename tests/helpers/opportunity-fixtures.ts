import opp01 from "@/contracts/fixtures/opp-01.success.json";
import type { Opportunity } from "@/features/opportunities";

// One real contract fixture (opp-01). Other cases are built from it with overrides.
export const opp01Response = opp01;
export const baseOpportunity = { ...opp01.data[0], in_tracker: false } as unknown as Opportunity;

export function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return { ...baseOpportunity, ...overrides };
}
