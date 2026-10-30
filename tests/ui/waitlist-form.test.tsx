// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { WaitlistForm } from "@/features/waitlist/waitlist-form";
import * as submitModule from "@/features/waitlist/submit";

beforeAll(() => {
  if (typeof window !== "undefined" && typeof window.ResizeObserver !== "function") {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverMock;
  }
});

beforeEach(() => {
  submitModule.resetWaitlistStore();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WaitlistForm", () => {
  it("AC-WL-01: invalid email shows an error and blocks submission", async () => {
    const submitSpy = vi.spyOn(submitModule, "submitWaitlist");
    render(<WaitlistForm />);

    // Fill valid college and name, but invalid email
    fireEvent.change(screen.getByLabelText(/college or university name/i), {
      target: { value: "State University" },
    });
    fireEvent.change(screen.getByLabelText(/your full name/i), {
      target: { value: "Alex Morgan" },
    });
    fireEvent.change(screen.getByLabelText(/college email address/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText(/your role/i), {
      target: { value: "student" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    // Verify error is shown and submission was blocked
    const errorMatches = await screen.findAllByText(/enter a valid email address/i);
    expect(errorMatches.length).toBeGreaterThan(0);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("AC-WL-02: same email + college twice returns success without duplicate storage", async () => {
    const payload = {
      college_name: "State University",
      contact_name: "Alex Morgan",
      contact_email: "alex@state.edu",
      role: "student" as const,
      consent: true as const,
      source: "landing",
    };

    // First submission
    const res1 = await submitModule.submitWaitlist(payload);
    expect(res1.data.joined).toBe(true);

    // Second submission with exact same email and college
    const res2 = await submitModule.submitWaitlist(payload);
    expect(res2.data.joined).toBe(true);
    expect(res2.meta.request_id).toBe("req_mock_idempotent");
  });

  it("AC-WL-03: without consent, form refuses submission", async () => {
    const submitSpy = vi.spyOn(submitModule, "submitWaitlist");
    render(<WaitlistForm />);

    fireEvent.change(screen.getByLabelText(/college or university name/i), {
      target: { value: "State University" },
    });
    fireEvent.change(screen.getByLabelText(/your full name/i), {
      target: { value: "Alex Morgan" },
    });
    fireEvent.change(screen.getByLabelText(/college email address/i), {
      target: { value: "alex@state.edu" },
    });
    fireEvent.change(screen.getByLabelText(/your role/i), {
      target: { value: "student" },
    });

    // Leave consent unchecked and submit
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    const consentErrors = await screen.findAllByText(
      /you must agree to be contacted and acknowledge the privacy notice/i,
    );
    expect(consentErrors.length).toBeGreaterThan(0);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it("AC-WL-04: keyboard-only submission works and errors are announced", async () => {
    render(<WaitlistForm />);

    // Trigger validation error via keyboard submit
    const submitBtn = screen.getByRole("button", { name: /join the waitlist/i });
    submitBtn.focus();
    fireEvent.click(submitBtn);

    // ErrorSummary is an alert that takes focus
    const alert = await screen.findByRole("alert");
    expect(document.activeElement).toBe(alert);

    // Links jump focus to fields
    const collegeLink = screen.getByRole("link", { name: /enter your college name/i });
    fireEvent.click(collegeLink);
    expect(document.activeElement).toBe(screen.getByLabelText(/college or university name/i));
  });

  it("preserves user input when submission fails validation", async () => {
    render(<WaitlistForm />);

    fireEvent.change(screen.getByLabelText(/college or university name/i), {
      target: { value: "Tech University" },
    });
    fireEvent.change(screen.getByLabelText(/your full name/i), {
      target: { value: "Jordan Taylor" },
    });
    // Leave email empty
    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    // Error is shown
    const emailErrors = await screen.findAllByText(/enter a valid email address/i);
    expect(emailErrors.length).toBeGreaterThan(0);

    // Inputs are preserved
    expect((screen.getByLabelText(/college or university name/i) as HTMLInputElement).value).toBe(
      "Tech University",
    );
    expect((screen.getByLabelText(/your full name/i) as HTMLInputElement).value).toBe(
      "Jordan Taylor",
    );
  });

  it("audience toggle changes role options and labels, and is not sent to API", async () => {
    const submitSpy = vi.spyOn(submitModule, "submitWaitlist");
    render(<WaitlistForm />);

    // Switch to staff
    fireEvent.click(screen.getByLabelText(/college staff or administrator/i));

    expect(screen.getByLabelText(/contact name/i)).toBeDefined();
    expect(screen.getByLabelText(/work email address/i)).toBeDefined();
    expect(screen.getByRole("option", { name: /college administrator/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /faculty or staff/i })).toBeDefined();

    // Fill and submit as staff
    fireEvent.change(screen.getByLabelText(/college or university name/i), {
      target: { value: "Central University" },
    });
    fireEvent.change(screen.getByLabelText(/contact name/i), {
      target: { value: "Dr. Smith" },
    });
    fireEvent.change(screen.getByLabelText(/work email address/i), {
      target: { value: "smith@central.edu" },
    });
    fireEvent.change(screen.getByLabelText(/your role/i), {
      target: { value: "college_admin" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(1);
    });

    // Check payload has strictly 6 contract keys, NO audience field
    const sentPayload = submitSpy.mock.calls[0]![0];
    expect(sentPayload).toEqual({
      college_name: "Central University",
      contact_name: "Dr. Smith",
      contact_email: "smith@central.edu",
      role: "college_admin",
      consent: true,
      source: "landing",
    });
    expect((sentPayload as Record<string, unknown>).audience).toBeUndefined();
  });

  it("honeypot suppresses submission to API and shows success", async () => {
    const submitSpy = vi.spyOn(submitModule, "submitWaitlist");
    render(<WaitlistForm />);

    // Fill honeypot field
    fireEvent.change(screen.getByLabelText(/do not fill this field/i), {
      target: { value: "bot-url" },
    });

    fireEvent.click(screen.getByRole("button", { name: /join the waitlist/i }));

    // Shows success without calling submitWaitlist
    expect(await screen.findByText(/you're on the waitlist/i)).toBeDefined();
    expect(submitSpy).not.toHaveBeenCalled();
  });
});
