"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { waitlistBody } from "@/contracts/engagement";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CheckboxField } from "@/components/ui/checkbox";
import { ErrorSummary } from "@/components/ui/error-summary";
import { submitWaitlist } from "@/features/waitlist/submit";

type Audience = "student" | "staff";

type FormErrors = {
  college_name?: string;
  contact_name?: string;
  contact_email?: string;
  role?: string;
  consent?: string;
  form?: string;
};

export function WaitlistForm() {
  const [audience, setAudience] = React.useState<Audience>("student");
  const [collegeName, setCollegeName] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [role, setRole] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState("");

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // When audience changes, reset role if not applicable
  const handleAudienceChange = (newAudience: Audience) => {
    setAudience(newAudience);
    if (newAudience === "student" && (role === "faculty" || role === "college_admin")) {
      setRole("");
    } else if (newAudience === "staff" && role === "student") {
      setRole("");
    }
  };

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!collegeName.trim()) {
      newErrors.college_name = "Enter your college name";
    } else if (collegeName.trim().length > 120) {
      newErrors.college_name = "College name must be 120 characters or fewer";
    }

    if (!contactName.trim()) {
      newErrors.contact_name = "Enter your full name";
    } else if (contactName.trim().length > 120) {
      newErrors.contact_name = "Full name must be 120 characters or fewer";
    }

    if (!contactEmail.trim()) {
      newErrors.contact_email = "Enter a valid email address";
    } else {
      // Validate with the contract's own email regex / parser
      const emailTest = waitlistBody.shape.contact_email.safeParse(contactEmail.trim());
      if (!emailTest.success) {
        newErrors.contact_email = "Enter a valid email address";
      }
    }

    const validRoles: readonly string[] =
      audience === "student" ? ["student", "other"] : ["college_admin", "faculty", "other"];

    if (!role || !validRoles.includes(role)) {
      newErrors.role = "Select your role";
    }

    if (!consent) {
      newErrors.consent = "You must agree to be contacted and acknowledge the Privacy Notice";
    }

    return newErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    // Honeypot check: if filled, show fake success immediately without sending
    if (honeypot) {
      setIsSuccess(true);
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Build strictly compliant payload (no audience, no honeypot)
    const payload = {
      college_name: collegeName.trim(),
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      role: role as "student" | "faculty" | "college_admin" | "other",
      consent: true as const,
      source: "landing",
    };

    setIsSubmitting(true);
    try {
      await submitWaitlist(payload);
      setIsSuccess(true);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-4 rounded-card border-2 border-success bg-surface p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2Icon aria-hidden="true" className="size-6 shrink-0 text-success" />
          <div className="flex flex-col gap-1">
            <h3 className="font-heading text-xl font-semibold text-foreground">
              You&apos;re on the waitlist
            </h3>
            <p className="text-base text-muted-foreground">
              We&apos;ll email when your college opens. You can reply to that email to unsubscribe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const errorSummaryItems = [
    errors.college_name && { fieldId: "waitlist-college", message: errors.college_name },
    errors.contact_name && { fieldId: "waitlist-name", message: errors.contact_name },
    errors.contact_email && { fieldId: "waitlist-email", message: errors.contact_email },
    errors.role && { fieldId: "waitlist-role", message: errors.role },
    errors.consent && { fieldId: "waitlist-consent", message: errors.consent },
    errors.form && { fieldId: "waitlist-submit", message: errors.form },
  ].filter(Boolean) as { fieldId: string; message: string }[];

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <ErrorSummary errors={errorSummaryItems} title="There is a problem with your submission" />

      {/* Screen-only Audience Toggle */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-base font-semibold text-foreground">I am a</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 glass-card rounded-[22px] px-4 py-2 text-base font-medium text-foreground hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-secondary">
            <input
              type="radio"
              name="audience"
              value="student"
              checked={audience === "student"}
              onChange={() => handleAudienceChange("student")}
              className="size-4 text-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>Student</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 glass-card rounded-[22px] px-4 py-2 text-base font-medium text-foreground hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-secondary">
            <input
              type="radio"
              name="audience"
              value="staff"
              checked={audience === "staff"}
              onChange={() => handleAudienceChange("staff")}
              className="size-4 text-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>College staff or administrator</span>
          </label>
        </div>
      </fieldset>

      {/* Screen-only Honeypot Field */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="waitlist-website">Do not fill this field</label>
        <input
          id="waitlist-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* College Name */}
      <FormField
        id="waitlist-college"
        label="College or university name"
        help="Enter the full name of your college"
        error={errors.college_name}
        required
      >
        <Input
          type="text"
          value={collegeName}
          onChange={(e) => setCollegeName(e.target.value)}
          placeholder="e.g. National Institute of Technology"
          autoComplete="organization"
        />
      </FormField>

      {/* Contact Name */}
      <FormField
        id="waitlist-name"
        label={audience === "student" ? "Your full name" : "Contact name"}
        error={errors.contact_name}
        required
      >
        <Input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="e.g. Alex Morgan"
          autoComplete="name"
        />
      </FormField>

      {/* Contact Email */}
      <FormField
        id="waitlist-email"
        label={audience === "student" ? "College email address" : "Work email address"}
        help={
          audience === "student"
            ? "Use your college email if you have one (.edu, .ac.in, etc.)"
            : "Use your official college or institution address"
        }
        error={errors.contact_email}
        required
      >
        <Input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="alex@college.edu"
          autoComplete="email"
        />
      </FormField>

      {/* Role */}
      <FormField id="waitlist-role" label="Your role" error={errors.role} required>
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Select your role...</option>
          {audience === "student" ? (
            <>
              <option value="student">Student</option>
              <option value="other">Other (clubs, ambassadors, others)</option>
            </>
          ) : (
            <>
              <option value="college_admin">College administrator</option>
              <option value="faculty">Faculty or staff</option>
              <option value="other">Other (clubs, ambassadors, others)</option>
            </>
          )}
        </Select>
      </FormField>

      {/* Consent */}
      <CheckboxField
        id="waitlist-consent"
        checked={consent}
        onCheckedChange={(checked) => setConsent(checked === true)}
        error={errors.consent}
        label={
          <span>
            I agree to be contacted about StudentOS and have read the{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary underline underline-offset-4 outline-none hover:text-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Privacy Notice
            </Link>
            .
          </span>
        }
      />

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          id="waitlist-submit"
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "Joining..." : "Join the waitlist"}
        </Button>
      </div>
    </form>
  );
}
