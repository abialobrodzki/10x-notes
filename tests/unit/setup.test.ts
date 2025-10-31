import { describe, it, expect } from "vitest";

/**
 * Sanity check to verify Vitest configuration is working
 */
describe("Vitest Setup", () => {
  it("should run basic test", () => {
    expect(true).toBe(true);
  });

  it("should have sessionStorage mock available", () => {
    expect(sessionStorage).toBeDefined();
    expect(typeof sessionStorage.setItem).toBe("function");
  });

  it("should have crypto.randomUUID mock available", () => {
    expect(crypto.randomUUID).toBeDefined();
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
