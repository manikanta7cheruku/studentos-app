-- Create a college and make its first admin (ADM-01 is not built yet, so this is how a college is born).
-- Where to run it: Supabase dashboard > SQL editor, in the PRODUCTION project (or staging to rehearse).
-- Before you run it: the admin must have signed in ONCE on the site with the email below (that creates the account
-- and the profile). The script refuses to run if the account does not exist.
-- Change only the values between the lines marked EDIT. Everything else stays as it is.
-- Safe to run twice: a second run stops with a clear message instead of making a second college.
do $$
declare
  -- EDIT ------------------------------------------------------------------------------------------
  v_slug text := 'my-college';                    -- 3 to 40 lowercase letters, digits or dashes. It is in the web address.
  v_name text := 'My College Name';
  v_short text := 'MCN';                          -- short name, may be empty: ''
  v_city text := 'My City';
  v_state text := 'My State';
  v_accent text := '#1D4ED8';                     -- brand colour, 6 hex digits
  v_domains text[] := array['mycollege.edu.in'];  -- email domains of the college (for "join with college email")
  v_admin_email text := 'admin@mycollege.edu.in'; -- the person who runs the college on StudentOS
  -- END EDIT --------------------------------------------------------------------------------------
  v_admin uuid;
  v_college uuid;
  v_domain text;
begin
  select u.id into v_admin from auth.users u where lower(u.email) = lower(btrim(v_admin_email));
  if v_admin is null then
    raise exception 'Nobody has signed in with % yet. Ask them to sign in once on the site, then run this again.', v_admin_email;
  end if;
  if exists (select 1 from public.colleges c where c.slug = v_slug) then
    raise exception 'A college with the slug "%" already exists. Nothing was changed.', v_slug;
  end if;

  insert into public.colleges (slug, name, short_name, city, state, status, accent_hex, created_by)
  values (v_slug, btrim(v_name), nullif(btrim(v_short), ''), btrim(v_city), btrim(v_state), 'active', v_accent, v_admin)
  returning id into v_college;

  foreach v_domain in array v_domains loop
    insert into public.college_domains (college_id, domain, verified_at) values (v_college, lower(btrim(v_domain)), now());
  end loop;

  -- college_settings is created by a trigger with safe defaults (admin approval on, all join methods).
  insert into public.memberships (user_id, college_id, role, status, verification_level, verification_method, joined_at)
  values (v_admin, v_college, 'college_admin', 'active', 3, 'manual', now());

  perform public.write_audit_log(v_college, v_admin, 'college_admin', 'college.created', 'college', v_college::text,
    jsonb_build_object('source', 'production-script', 'slug', v_slug), null);

  raise notice 'Done. College "%" created. Open /c/% on the site and sign in as %.', v_name, v_slug, v_admin_email;
end;
$$;
