const name = process.argv[2] ?? "database command";
process.stderr.write(
  `[${name}] Supabase is not configured yet. The local database is added on Day 2 (R2). ` +
    "This command fails on purpose so nobody mistakes it for a pass.\n",
);
process.exit(1);
