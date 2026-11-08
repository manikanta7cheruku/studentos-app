import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScreenMessage } from "@/components/app/screen-message";

export default function NotFound() {
  return (
    <ScreenMessage
      eyebrow="Error 404"
      title="We could not find that page."
      actions={
        <Button asChild>
          <Link href="/">Go to the home page</Link>
        </Button>
      }
    >
      The address may be wrong, or the page may have moved. If you were sent a link by your college,
      ask them to send it again.
    </ScreenMessage>
  );
}
