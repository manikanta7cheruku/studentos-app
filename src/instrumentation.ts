// Runs once when the server starts, before it answers any request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnvAtStartup } = await import("@/lib/startup-check");
    try {
      checkEnvAtStartup();
    } catch (error) {
      // Stop the server, so a deploy with a missing setting never serves requests. Names only, no values.
      console.error(
        `The app refuses to start. ${error instanceof Error ? error.message : "Invalid settings."}`,
      );
      process.exit(1);
    }
  }
}
