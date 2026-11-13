import Link from "next/link";
import { LegalPage, legalMetadata, type LegalSection } from "@/components/site/legal-page";

export const instant = false;

export const metadata = legalMetadata(
  "Terms of Service",
  "The agreement between you and StudentOS for using the website and app.",
);

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        These terms are an agreement between you and StudentOS. By creating an account or using the
        website or app, you agree to them, to our <Link href="/privacy">Privacy Notice</Link> and to
        our <Link href="/guidelines">Community Guidelines</Link>. If you do not agree, please do not
        use StudentOS.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use StudentOS",
    body: (
      <ul>
        <li>
          You must be at least 16 years old and be a student, or be joining as a student would.
        </li>
        <li>You must give true information and keep it up to date.</li>
        <li>
          You may have one account, and you are responsible for what happens on it. Keep your email
          account secure.
        </li>
        <li>You must not use StudentOS if we have closed your account for breaking these terms.</li>
      </ul>
    ),
  },
  {
    id: "service",
    title: "The service",
    body: (
      <>
        <p>
          StudentOS lets you make plans, share buzz, join debates, connect with other students, send
          private messages and take part in college spaces. Some features are marked &quot;Coming
          soon&quot; and are not available yet.
        </p>
        <p>
          We may change, pause or remove features, and we may limit how much something can be used.
          StudentOS is provided free of charge for now. If that changes we will tell you before it
          applies to you.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "What you post",
    body: (
      <>
        <p>
          You own what you post. You give StudentOS a limited, worldwide, free licence to store,
          display and deliver it so that the service works, for example to show your plan to others
          or deliver your message. This ends when you delete the content or your account, apart from
          copies that other people have already received or that we must keep as described in the
          Privacy Notice.
        </p>
        <p>
          You are responsible for what you post. You promise that you have the right to share it and
          that it does not break the law or the Community Guidelines.
        </p>
      </>
    ),
  },
  {
    id: "rules",
    title: "What you must not do",
    body: (
      <ul>
        <li>Harass, threaten, bully, impersonate or discriminate against anyone.</li>
        <li>
          Post sexual, violent, hateful or illegal content, or content that exploits or endangers
          anyone, especially minors.
        </li>
        <li>
          Share another person&apos;s private information or messages without their permission.
        </li>
        <li>Spam, scam, advertise without permission or sell things that are not allowed.</li>
        <li>Try to break, overload, scrape or get around the security or limits of StudentOS.</li>
        <li>Use StudentOS to plan or carry out anything unlawful.</li>
      </ul>
    ),
  },
  {
    id: "anonymous",
    title: "Anonymous posting",
    body: (
      <p>
        Posting anonymously hides your name from other members only. We can still see who posted,
        and we may act on it or share it where the law requires or to protect someone from harm.
        Anonymous posts follow all the same rules.
      </p>
    ),
  },
  {
    id: "messages",
    title: "Messages",
    body: (
      <p>
        Private messages disappear on the schedule in the Privacy Notice, but the person you write
        to can save or copy them first. Messages are not end-to-end encrypted. Do not send anything
        you would not be comfortable with others seeing.
      </p>
    ),
  },
  {
    id: "enforcement",
    title: "Moderation and enforcement",
    body: (
      <>
        <p>
          We review reports and may remove content, limit features, suspend or close accounts, with
          or without notice, where we think these terms or the Community Guidelines have been broken
          or someone may be at risk. We may share information with authorities where required.
        </p>
        <p>You can close your account at any time from Settings.</p>
      </>
    ),
  },
  {
    id: "meetups",
    title: "Meeting people in person",
    body: (
      <p>
        Plans and events can lead to meeting in person. StudentOS does not check, supervise or
        organise what members do offline and is not responsible for it. Please read our{" "}
        <Link href="/safety">Safety</Link> page, meet in public places and take care.
      </p>
    ),
  },
  {
    id: "thirdparty",
    title: "Other people and other services",
    body: (
      <p>
        Members are responsible for what they say and do. Links to other sites and sign-in through
        Google are governed by those services&apos; own terms. We do not control them.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "No guarantees",
    body: (
      <p>
        StudentOS is provided &quot;as is&quot; and &quot;as available&quot;. We work hard to keep
        it running well, but we do not promise it will be uninterrupted, error-free or free from
        loss of content.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Our responsibility",
    body: (
      <p>
        To the extent the law allows, StudentOS is not liable for indirect or consequential loss,
        for what members post or do, or for losses beyond what you would reasonably expect from a
        free service. Nothing in these terms limits rights you have by law that cannot be limited.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of India, and the courts there will decide any dispute,
        unless the law where you live gives you the right to use your local courts.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        We may update these terms. If a change matters, we will tell you in the app. If you keep
        using StudentOS after the change, you accept the new terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these terms? See <Link href="/contact">Contact</Link>.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="13 November 2026"
      intro={
        <p>
          Please read these terms. They explain what you can expect from StudentOS and what we
          expect from you.
        </p>
      }
      sections={sections}
    />
  );
}
