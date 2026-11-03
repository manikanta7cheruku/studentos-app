import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * Browser worker instance for intercepting requests during local development.
 */
export const worker = setupWorker(...handlers);
