import Link from "next/link";
import { LegalPage, legalMetadata, type LegalSection } from "@/components/site/legal-page";

export const instant = false;

export const metadata = legalMetadata(
  "Privacy Notice",
  "What StudentOS collects, why, who handles it, how long it is kept, and the choices you have.",
);

const sections: LegalSection[] = [
  {
    id: "who",
    title: "Who we are and what this covers",
    body: (
      <>
        <p>
          StudentOS (&quot;StudentOS&quot;, &quot;we&quot;, &quot;us&quot;) runs the StudentOS
          website and app, a place for students to make plans, share ideas, join debates, meet
          people and message each other. This notice explains what personal information we handle
          when you use it, why we handle it, and the choices you have.
        </p>
        <p>
          It applies to everyone who visits the site or has an account. By creating an account you
          confirm that you have read it. If you do not agree with it, please do not use StudentOS.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "Information we collect",
    body: (
      <>
        <p>
          <b>Information you give us.</b>
        </p>
        <ul>
          <li>
            Your email address, or the email and basic profile details (name, profile picture) that
            Google shares when you choose to continue with Google.
          </li>
          <li>Your name, a handle, a profile picture, a short bio and your interests.</li>
          <li>Your college name, branch, graduation year and place, as you type them in.</li>
          <li>Optional details: a phone number and your birth year.</li>
          <li>
            Your gender, which is kept private and is used only to keep the community safe and to
            run features that depend on it.
          </li>
          <li>
            What you post and send: plans, buzz, debate arguments and votes, events, comments,
            reactions, requests, feedback, reports and private messages.
          </li>
        </ul>
        <p>
          <b>Information created when you use StudentOS.</b>
        </p>
        <ul>
          <li>
            Sign-in and security records, such as when you signed in and from which kind of device.
          </li>
          <li>
            Activity such as who you connected with, what you joined, what you voted on and
            notifications you received.
          </li>
          <li>
            Technical information your browser sends, such as device type, browser and approximate
            location from the network address.
          </li>
        </ul>
        <p>
          <b>Information from others.</b> People may mention you, invite you, connect with you or
          report content. If you were invited with a link, we note who invited you.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul>
        <li>To create and run your account and sign you in.</li>
        <li>To show your profile, plans, posts and messages to the people they are meant for.</li>
        <li>
          To suggest people, plans and debates that may interest you, based on your interests and
          activity.
        </li>
        <li>
          To send you messages about the service, such as sign-in codes, requests and notifications.
        </li>
        <li>
          To keep the community safe: to review reports, act on rule-breaking, prevent abuse and
          spam, and protect people.
        </li>
        <li>To fix problems, measure how the service performs and improve it.</li>
        <li>To meet legal obligations and respond to lawful requests.</li>
      </ul>
    ),
  },
  {
    id: "messages",
    title: "Private messages and encryption",
    body: (
      <>
        <p>
          Private messages are sent between you and the person you write to. They are stored on our
          servers and sent over an encrypted connection, but they are{" "}
          <b>not end-to-end encrypted</b>. This means that the people who run StudentOS and our
          service providers can technically access message content stored on our systems. We only
          look at it where this is needed to operate the service, to investigate a report, to keep
          people safe or because the law requires it.
        </p>
        <p>
          Messages are designed to disappear. A message is removed about one hour after it has been
          opened, and three days after it was sent if it was never opened. A person you wrote to can
          still save, copy or screenshot what you sent before it disappears, and we cannot prevent
          that. If a message is reported, a copy of the recent messages in that conversation is kept
          with the report so it can be reviewed.
        </p>
        <p>
          The same applies to everything else in StudentOS, including plans, buzz, debates and
          profile details: it is stored on our systems and is not end-to-end encrypted.
        </p>
      </>
    ),
  },
  {
    id: "anonymous",
    title: "Anonymous posts",
    body: (
      <p>
        Some places, such as debates, let you take part without your name showing to other people.
        Other members will not see who you are, but the post is still linked to your account in our
        records. We can see who wrote it and may use that to review a report, to enforce our rules
        and where the law requires it. Anonymous does not mean unaccountable.
      </p>
    ),
  },
  {
    id: "visible",
    title: "Who can see what",
    body: (
      <ul>
        <li>
          Your name, handle, picture, interests and the plans and posts you share are visible to
          other members, depending on where you post them (Global or a college space).
        </li>
        <li>Your gender, phone number and email are not shown on your profile.</li>
        <li>
          Private messages are visible only to you and the person you are writing to, apart from the
          access described above.
        </li>
        <li>
          College spaces are meant for the members of that college. Content shared there is not
          public.
        </li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We do not sell your personal information. We share it only with:</p>
        <ul>
          <li>
            <b>Service providers</b> that help us run StudentOS under our instructions: our hosting
            and database provider (Supabase and Vercel), our email delivery provider for sign-in
            codes and notices, and Google if you choose to sign in with Google.
          </li>
          <li>
            <b>Other members</b>, as described above, when you post, connect or message.
          </li>
          <li>
            <b>Authorities or others</b> where we believe in good faith that this is required by
            law, or necessary to protect someone&apos;s safety or the rights of StudentOS and its
            members.
          </li>
          <li>
            <b>A successor</b>, if StudentOS is ever merged or taken over, who would be bound to
            this notice.
          </li>
        </ul>
        <p>
          Some of these providers process data outside your country. We choose providers that
          protect it appropriately.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <ul>
        <li>Account information is kept while your account exists.</li>
        <li>Private messages are removed on the schedule described above.</li>
        <li>
          Reports and the evidence kept with them are kept as long as needed to deal with the report
          and to prevent repeat harm.
        </li>
        <li>Security and sign-in records are kept for a limited period.</li>
        <li>
          After you delete your account we remove or anonymise your information, except what we must
          keep by law or to settle a dispute, and backups that are overwritten on their normal
          cycle.
        </li>
      </ul>
    ),
  },
  {
    id: "choices",
    title: "Your choices and rights",
    body: (
      <>
        <ul>
          <li>
            You can see and edit your profile details in Settings and change who can see parts of
            your profile.
          </li>
          <li>You can block people, mute things, and report content or people.</li>
          <li>You can delete your account from Settings.</li>
          <li>
            You can ask us to give you a copy of your information, correct it, or delete it, and you
            can object to some uses of it.
          </li>
        </ul>
        <p>
          To make a request, use the feedback form inside the app or the{" "}
          <Link href="/contact">Contact</Link> page. We may need to confirm it is you first. You may
          also complain to your local data protection authority.
        </p>
      </>
    ),
  },
  {
    id: "age",
    title: "Age",
    body: (
      <p>
        StudentOS is for students who are at least 16 years old. If we learn that someone younger
        has an account, we will close it. If you think this has happened, please tell us.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We use sign-in codes instead of passwords, encrypted connections, restricted access to our
        systems and regular clean-up of old data. No system is perfectly secure, and we cannot
        guarantee that information will never be accessed without permission. Please take care with
        what you share, and do not put in anything you would not want others to see.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technology",
    body: (
      <p>
        We use a small number of cookies and browser storage that are needed to keep you signed in,
        remember your choices (such as having seen the tour) and keep the service secure. We do not
        use them for advertising.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this notice",
    body: (
      <p>
        We may update this notice as StudentOS grows. When we make an important change we will tell
        you in the app. The date at the top shows when it was last changed. Continuing to use
        StudentOS after a change means you accept the updated notice.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about this notice? See our <Link href="/contact">Contact</Link> page, or send
        feedback from inside the app.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Privacy Notice"
      updated="13 November 2026"
      intro={
        <p>
          We want you to know what happens to your information. This notice is written to be read,
          and we have kept it as plain as we can.
        </p>
      }
      sections={sections}
    />
  );
}
