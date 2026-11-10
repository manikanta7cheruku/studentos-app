import { StartRedirect } from "@/features/session/start-redirect";

export const instant = false;

// The page after sign in when there is nowhere specific to go back to. It finds the right place for the person.
export default function StartPage() {
  return <StartRedirect />;
}
