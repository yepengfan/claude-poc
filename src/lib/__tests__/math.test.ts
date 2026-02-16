import { sumUpTo } from "../math";

describe("sumUpTo", () => {
  it("returns 1 for n=1", () => {
    expect(sumUpTo(1)).toBe(1);
  });

  it("returns 15 for n=5", () => {
    expect(sumUpTo(5)).toBe(15);
  });

  it("returns 5050 for n=100", () => {
    expect(sumUpTo(100)).toBe(5050);
  });

  it("returns 0 for n=0", () => {
    expect(sumUpTo(0)).toBe(0);
  });

  it("throws for negative numbers", () => {
    expect(() => sumUpTo(-1)).toThrow("must be a non-negative integer");
  });

  it("throws for non-integer values", () => {
    expect(() => sumUpTo(3.5)).toThrow("must be a non-negative integer");
  });
});
