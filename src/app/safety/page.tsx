import Link from "next/link";
import { LegalPage, legalMetadata, type LegalSection } from "@/components/site/legal-page";

export const instant = false;

export const metadata = legalMetadata(
  "Safety",
  "Tips for staying safe on StudentOS and when meeting people from it, and how to report a problem.",
);

const sections: LegalSection[] = [
  {
    id: "online",
    title: "Staying safe online",
    body: (
      <ul>
        <li>
          Share only what you are comfortable with. Think before posting your phone number, address,
          timetable or photos.
        </li>
        <li>Never share your sign-in codes with anyone. StudentOS will never ask for them.</li>
        <li>Be careful with requests for money, links that look odd or people in a hurry.</li>
        <li>
          Messages disappear, but the other person can save them. Do not send anything you would not
          want shared.
        </li>
      </ul>
    ),
  },
  {
    id: "meeting",
    title: "Meeting people in person",
    body: (
      <ul>
        <li>Meet in a public, busy place the first time, and during the day where you can.</li>
        <li>Tell a friend or family member where you are going and who you are meeting.</li>
        <li>Arrange your own travel, and keep your phone charged.</li>
        <li>
          Trust your instincts. You can leave or cancel at any moment, without giving a reason.
        </li>
        <li>Group plans with several people are usually the safest way to meet someone new.</li>
      </ul>
    ),
  },
  {
    id: "control",
    title: "Tools you control",
    body: (
      <ul>
        <li>
          <b>Block</b> anyone to stop them contacting you.
        </li>
        <li>
          <b>Report</b> a post, person or message from its menu. Reports are reviewed by people.
        </li>
        <li>
          <b>Decline</b> message requests and connection requests you do not want.
        </li>
        <li>Choose what shows on your profile in Settings.</li>
      </ul>
    ),
  },
  {
    id: "report",
    title: "If something goes wrong",
    body: (
      <>
        <p>
          If you are in danger or someone is at risk, contact your local emergency services first.
          StudentOS is not an emergency service and cannot respond in real time.
        </p>
        <p>
          For anything on StudentOS, use Report in the app. For a serious concern you cannot report
          there, see <Link href="/contact">Contact</Link>. For how we expect people to behave, read
          the <Link href="/guidelines">Community Guidelines</Link>.
        </p>
      </>
    ),
  },
  {
    id: "support",
    title: "Support",
    body: (
      <p>
        If you feel overwhelmed, speak to someone you trust, your college counsellor or a local
        helpline. You do not have to deal with it alone.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Safety"
      updated="13 November 2026"
      intro={
        <p>
          Most people on StudentOS are simply students looking to do things together. A few habits
          keep it that way.
        </p>
      }
      sections={sections}
    />
  );
}
