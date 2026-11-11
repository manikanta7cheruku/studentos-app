# How to run and view the redesign

## Fastest: without a database (sample data)
The screens can run on built-in sample data. Nothing is saved; a reload resets it.

```bash
git checkout feat/redesign-v2
pnpm install
```

Create a file `.env.development.local` in the project folder with one line:

```
NEXT_PUBLIC_API_MOCKING=enabled
```

Then start the app and open the addresses below.

```bash
pnpm dev
```

| Open | What you see |
|---|---|
| http://localhost:3000/ | the new landing page |
| http://localhost:3000/signin | the welcome screen |
| http://localhost:3000/find | choose Global or your college |
| http://localhost:3000/setup | the college admin path (type any 8 digits except 00000000) |
| http://localhost:3000/c/alpha/home | the Home feed (plans and ideas) |
| http://localhost:3000/c/alpha/collaborate | Plans |
| http://localhost:3000/c/alpha/ideas | Ideas |
| http://localhost:3000/c/alpha/events | Events |
| http://localhost:3000/c/alpha/lost-found | Lost and found |
| http://localhost:3000/c/alpha/market | Marketplace |
| http://localhost:3000/c/alpha/me | You (the More menu has everything else) |

Tip: open them in the browser at phone width (right click, Inspect, the phone icon), and on your real phone through your computer's address on the same Wi-Fi (for example `http://192.168.x.x:3000`).

## With the real database (everything saved)
Docker Desktop must be running.

```bash
pnpm db:start
pnpm supabase db reset
pnpm dev
```

Remove `.env.development.local` (or set the line to `disabled`). Sign in with `student1@alpha.test`; the code is in Mailpit at http://127.0.0.1:54324. `supabase db reset` applies the new migrations (`20261114000000` and `20261115000000`) and the sample colleges and people.

To try the college admin path with a real code, run `select public.make_college_setup_code('My college', 14);` in Studio (http://127.0.0.1:54323, SQL editor), then sign in and open `/setup`.
