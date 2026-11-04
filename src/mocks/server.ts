import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Node server instance for intercepting requests during tests (Vitest).
 */
export const server = setupServer(...handlers);
