import Link from "next/link";
import { LegalPage, legalMetadata, type LegalSection } from "@/components/site/legal-page";

export const instant = false;

export const metadata = legalMetadata(
  "Community Guidelines",
  "How we expect everyone on StudentOS to behave, so it stays a good place for students.",
);

const sections: LegalSection[] = [
  {
    id: "respect",
    title: "Be respectful",
    body: (
      <>
        <p>
          Treat everyone the way you would like to be treated. Disagree with ideas, not with people.
          Debate hard, but never make it personal.
        </p>
        <ul>
          <li>No insults, bullying, humiliation or pile-ons.</li>
          <li>
            No hate or discrimination based on religion, caste, gender, race, nationality,
            disability, sexuality, region, college or anything else about who someone is.
          </li>
          <li>No threats or encouraging anyone to hurt themselves or others.</li>
        </ul>
      </>
    ),
  },
  {
    id: "honest",
    title: "Be real and honest",
    body: (
      <ul>
        <li>
          Use your own identity. Do not pretend to be another person, a teacher or an official.
        </li>
        <li>Do not spread rumours or false claims about people or colleges.</li>
        <li>
          Anonymous options are for honest opinions, not for attacking people. Anonymous posts
          follow every rule here.
        </li>
      </ul>
    ),
  },
  {
    id: "private",
    title: "Respect privacy",
    body: (
      <ul>
        <li>
          Do not share someone else&apos;s phone number, address, photos, messages or personal
          details without their permission.
        </li>
        <li>Do not screenshot and spread private conversations to shame or target someone.</li>
        <li>If someone says no or stops replying, accept it.</li>
      </ul>
    ),
  },
  {
    id: "safe",
    title: "Keep it safe and legal",
    body: (
      <ul>
        <li>No sexual content, nudity or sexual pressure.</li>
        <li>No graphic violence, dangerous challenges, drugs or anything illegal.</li>
        <li>
          No content involving minors in any harmful or sexual way. We report this to the
          authorities.
        </li>
        <li>No cheating services, fake documents or selling exam material.</li>
      </ul>
    ),
  },
  {
    id: "spam",
    title: "No spam or scams",
    body: (
      <ul>
        <li>Do not flood people with the same message, requests or links.</li>
        <li>Do not advertise, promote or sell without permission.</li>
        <li>Never ask for money, passwords or codes, and do not trust anyone who does.</li>
      </ul>
    ),
  },
  {
    id: "plans",
    title: "Plans and meetups",
    body: (
      <ul>
        <li>Say what the plan really is, and show up or tell people if you cannot.</li>
        <li>Respect the people who join. Everyone is welcome to leave a plan at any time.</li>
        <li>
          Read the <Link href="/safety">Safety</Link> tips before meeting someone new.
        </li>
      </ul>
    ),
  },
  {
    id: "report",
    title: "Reports and what happens next",
    body: (
      <>
        <p>
          If something is wrong, use Report on a post, person or message, or block the person.
          Reports are reviewed by people. Depending on what happened we may remove content, limit
          features, suspend or close accounts, and in serious cases involve the authorities. Please
          report honestly. Fake or repeated reports to target someone also break these guidelines.
        </p>
        <p>
          These guidelines work with our <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Notice</Link>.
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Community Guidelines"
      updated="13 November 2026"
      intro={
        <p>
          StudentOS works because students look out for each other. These guidelines explain how we
          all behave so that it stays a good place for everyone.
        </p>
      }
      sections={sections}
    />
  );
}
