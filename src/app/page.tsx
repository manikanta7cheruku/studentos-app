export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 text-base text-foreground sm:px-6">
      <section aria-labelledby="hero-title" className="flex flex-col gap-3">
        <h1 id="hero-title" className="font-heading text-3xl font-semibold">
          One place for your college.
        </h1>
        <p>
          Find teammates for projects and hackathons, keep track of your internship applications,
          and build a portfolio - in a space run by your own college.
        </p>
        <p>
          <a href="#waitlist" className="font-medium underline underline-offset-4">
            Join the waitlist
          </a>
        </p>
        <p>Bringing StudentOS to a college? (link to the colleges page comes later)</p>
        <p>Free for students. Currently in development.</p>
      </section>

      <section aria-labelledby="problem-title" className="flex flex-col gap-3">
        <h2 id="problem-title" className="font-heading text-2xl font-semibold">
          The problem, in student words
        </h2>
        <p>
          Teams get formed in group chats. Applications live in spreadsheets. Projects disappear
          when the semester ends.
        </p>
      </section>

      <section aria-labelledby="features-title" className="flex flex-col gap-3">
        <h2 id="features-title" className="font-heading text-2xl font-semibold">
          What you can do
        </h2>
        <h3 className="font-heading text-xl font-semibold">Find your team</h3>
        <p>Post the roles you need, see who requests to join, accept or decline.</p>
        <h3 className="font-heading text-xl font-semibold">Track every application</h3>
        <p>Statuses, deadlines and reminders. Private to you.</p>
        <h3 className="font-heading text-xl font-semibold">Show what you have built</h3>
        <p>A profile and portfolio with projects you can share.</p>
        <p>Coming next: campus announcements, Lost and Found, events. Not available yet.</p>
      </section>

      <section aria-labelledby="trust-title" className="flex flex-col gap-3">
        <h2 id="trust-title" className="font-heading text-2xl font-semibold">
          Your college, your rules
        </h2>
        <p>
          Each college has its own private space. Members are verified, using a college email,
          invite codes, a roster or admin approval, depending on the college. Your application
          tracker is never visible to anyone else, including admins. Reporting and moderation are
          built in. (link to the safety page comes later)
        </p>
      </section>

      <section aria-labelledby="start-title" className="flex flex-col gap-3">
        <h2 id="start-title" className="font-heading text-2xl font-semibold">
          How it starts
        </h2>
        <ol className="flex list-decimal flex-col gap-1 pl-6">
          <li>Your college joins.</li>
          <li>You verify that you belong.</li>
          <li>You start.</li>
        </ol>
        <p>Verification methods differ by college.</p>
      </section>

      <section aria-labelledby="colleges-title" className="flex flex-col gap-3">
        <h2 id="colleges-title" className="font-heading text-2xl font-semibold">
          For colleges
        </h2>
        <p>
          Control who joins, and post official notices and opportunities. (link to the colleges page
          comes later)
        </p>
      </section>

      <section aria-labelledby="faq-title" className="flex flex-col gap-3">
        <h2 id="faq-title" className="font-heading text-2xl font-semibold">
          Questions
        </h2>
        <p>Answers will be written from the privacy and product docs before launch.</p>
        <ul className="flex list-disc flex-col gap-1 pl-6">
          <li>Is it free?</li>
          <li>Which colleges?</li>
          <li>Who can see my profile?</li>
          <li>How do I verify?</li>
          <li>What data do you collect?</li>
          <li>Can my college remove content?</li>
          <li>How do I delete my account?</li>
          <li>What if my college is not on StudentOS?</li>
        </ul>
      </section>

      <section id="waitlist" aria-labelledby="waitlist-title" className="flex flex-col gap-3">
        <h2 id="waitlist-title" className="font-heading text-2xl font-semibold">
          Join the waitlist
        </h2>
        <p>The waitlist form is built on Day 4 using the form parts.</p>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-6">
        <p>Working name: StudentOS.</p>
        <p>Privacy, terms and contact links come later.</p>
      </footer>
    </main>
  );
}
