-- Make a one-time college setup code (the "owner PIN"). Only the platform owner runs this.
-- Where to run it: Supabase dashboard > SQL editor, in the PRODUCTION project (or staging to rehearse).
-- The result is an 8 digit code. Send it to the college contact. It works once and expires after the number of days
-- you pass (1 to 30, default 14). Only its hash is stored, so run this again if the code is lost.
select public.make_college_setup_code('Name of the college, for your own notes', 14) as setup_code;
