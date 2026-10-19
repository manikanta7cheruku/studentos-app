const name = process.argv[2] ?? "database command";
process.stderr.write(
  `[${name}] Supabase is not configured yet. The local database setup is added by R2 and is not merged yet. ` +
    "This command fails on purpose so nobody mistakes it for a pass.\n",
);
process.exit(1);
