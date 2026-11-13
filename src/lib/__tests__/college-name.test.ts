import { describe, expect, it } from "vitest";
import { collegeNameProblem } from "../college-name";

describe("college name checks", () => {
  it("accepts real names", () => {
    for (const name of [
      "Alpha Institute of Technology",
      "MRCET",
      "St. Joseph's College of Engineering",
      "IIT Madras",
      "Jawaharlal Nehru Technological University",
      "ఆంధ్ర విశ్వవిద్యాలయం",
    ])
      expect(collegeNameProblem(name), name).toBeNull();
  });

  it("refuses made up or empty values", () => {
    for (const name of [
      "",
      "ab",
      "test",
      "None",
      "asdfgh",
      "aaaaaa",
      "xyz kkk",
      "12345",
      "!!!???",
      "qwerty college",
      "N/A",
      "hhhhhh",
    ])
      expect(collegeNameProblem(name), name).not.toBeNull();
  });

  it("ignores extra spaces", () => {
    expect(collegeNameProblem("  Alpha   College  ")).toBeNull();
  });
});
