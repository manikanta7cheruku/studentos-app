// @vitest-environment jsdom
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OtpInput } from "@/components/app/otp-input";
import { Avatar, initialsOf } from "@/components/app/avatar";

afterEach(cleanup);

function Harness({ onComplete }: { onComplete: (value: string) => void }) {
  const [value, setValue] = React.useState("");
  return <OtpInput label="Code" value={value} onChange={setValue} onComplete={onComplete} />;
}

describe("OtpInput", () => {
  it("keeps digits only and reports when all six are in", () => {
    const done = vi.fn();
    render(<Harness onComplete={done} />);
    const input = screen.getByLabelText("Code") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12a3" } });
    expect(input.value).toBe("123");
    expect(done).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "123456" } });
    expect(done).toHaveBeenCalledWith("123456");
  });

  it("takes a pasted code with spaces", () => {
    const done = vi.fn();
    render(<Harness onComplete={done} />);
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "123 456 789" } });
    expect(done).toHaveBeenCalledWith("123456");
  });

  it("offers the code from the mail to the phone", () => {
    render(<Harness onComplete={() => undefined} />);
    expect(screen.getByLabelText("Code").getAttribute("autocomplete")).toBe("one-time-code");
  });
});

describe("Avatar", () => {
  it("makes initials from a name", () => {
    expect(initialsOf("Riya Sharma")).toBe("RS");
    expect(initialsOf("Madonna")).toBe("MA");
    expect(initialsOf("   ")).toBe("?");
  });

  it("shows the initials when there is no picture", () => {
    render(<Avatar name="Riya Sharma" />);
    expect(screen.getByText("RS")).toBeTruthy();
  });
});
