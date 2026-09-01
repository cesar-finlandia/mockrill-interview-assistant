import { describe, it, expect } from "vitest";
import { formatTimestamp } from "src/mockrill/contracts/time.js";

describe("formatTimestamp", () => {
  it("cases", () => {
    expect(formatTimestamp(0)).toBe("00:00");
    expect(formatTimestamp(462000)).toBe("07:42");
    expect(formatTimestamp(-5)).toBe("00:00");
    expect(formatTimestamp(59999)).toBe("00:59");
    expect(formatTimestamp(3600000)).toBe("60:00");
    expect(formatTimestamp(4504000)).toBe("75:04");
    expect(formatTimestamp(1000)).toBe("00:01");
    expect(formatTimestamp(61000)).toBe("01:01");
  });
});
