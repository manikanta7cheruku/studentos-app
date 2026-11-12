-- Migration: social skills in the skills catalog (R3-D24).
-- People are not only their code. Classmates look for a teammate who can talk, lead or organise, so the catalog now has
-- the common social and working skills next to the technical ones. The skills screen suggests them as one tap chips.
-- Safe to run again: a name that exists (in any letter case) is left alone.

insert into public.skills (name, category, status)
values
  ('Communication', 'Social', 'approved'),
  ('Talkative', 'Social', 'approved'),
  ('Public speaking', 'Social', 'approved'),
  ('Storytelling', 'Social', 'approved'),
  ('Active listening', 'Social', 'approved'),
  ('Teamwork', 'Social', 'approved'),
  ('Leadership', 'Social', 'approved'),
  ('Networking', 'Social', 'approved'),
  ('Empathy', 'Social', 'approved'),
  ('Negotiation', 'Social', 'approved'),
  ('Persuasion', 'Social', 'approved'),
  ('Mentoring', 'Social', 'approved'),
  ('Event hosting', 'Social', 'approved'),
  ('Conflict resolution', 'Social', 'approved'),
  ('Time management', 'Working style', 'approved'),
  ('Problem solving', 'Working style', 'approved'),
  ('Creativity', 'Working style', 'approved'),
  ('Adaptability', 'Working style', 'approved'),
  ('Critical thinking', 'Working style', 'approved'),
  ('Organising', 'Working style', 'approved'),
  ('Figma', 'Design', 'approved'),
  ('Video editing', 'Creative', 'approved'),
  ('Content writing', 'Creative', 'approved'),
  ('Photography', 'Creative', 'approved')
on conflict do nothing;
