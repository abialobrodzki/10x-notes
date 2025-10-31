import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, cleanupExpiredEntries, createRateLimitResponse } from "@/lib/middleware/rate-limit.middleware";

// Helper to create mock Request with custom headers
function createMockRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", {
    method: "POST",
    headers: new Headers(headers),
  });
}

describe("rate-limit.middleware", () => {
  // ============================================================================
  // IP Extraction
  // ============================================================================

  describe("IP extraction", () => {
    it("should extract IP from X-Forwarded-For header", () => {
      // Arrange
      const request = createMockRequest({
        "x-forwarded-for": "192.168.1.100",
      });

      // Act
      const result = checkRateLimit(request);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 1 request consumed
    });

    it("should extract first IP from comma-separated X-Forwarded-For", () => {
      const uniqueIp = `192.168.100.${Math.floor(Math.random() * 255)}`;
      const request1 = createMockRequest({
        "x-forwarded-for": `${uniqueIp}, 10.0.0.1, 172.16.0.1`,
      });
      const request2 = createMockRequest({
        "x-forwarded-for": `${uniqueIp}, 10.0.0.1, 172.16.0.1`,
      });

      const result1 = checkRateLimit(request1);
      const result2 = checkRateLimit(request2);

      // Both requests should count towards same IP
      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(98);
    });

    it("should extract IP from X-Real-IP header when X-Forwarded-For not present", () => {
      const request = createMockRequest({
        "x-real-ip": "203.0.113.5",
      });

      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it("should prefer X-Forwarded-For over X-Real-IP", () => {
      const uniqueIp = `192.168.101.${Math.floor(Math.random() * 255)}`;
      const request1 = createMockRequest({
        "x-forwarded-for": uniqueIp,
        "x-real-ip": "203.0.113.5",
      });
      const request2 = createMockRequest({
        "x-forwarded-for": uniqueIp,
        "x-real-ip": "203.0.113.5",
      });

      const result1 = checkRateLimit(request1);
      const result2 = checkRateLimit(request2);

      // Should use X-Forwarded-For IP
      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(98);
    });

    it('should use "unknown" when no IP headers present', () => {
      const request1 = createMockRequest({});
      const request2 = createMockRequest({});

      const result1 = checkRateLimit(request1);
      const result2 = checkRateLimit(request2);

      // Both should count towards "unknown" IP
      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(98);
    });

    it("should trim whitespace from IP addresses", () => {
      const uniqueIp = `192.168.102.${Math.floor(Math.random() * 255)}`;
      const request = createMockRequest({
        "x-forwarded-for": `  ${uniqueIp}  `,
      });

      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });

  // ============================================================================
  // Rate Limiting Logic
  // ============================================================================

  describe("rate limiting logic", () => {
    beforeEach(() => {
      // Clear rate limit store by creating new requests with unique IPs
      // (No direct access to store, so we use unique IPs per test)
    });

    it("should allow first request from new IP", () => {
      // Arrange
      const uniqueIp = `192.168.1.${Math.floor(Math.random() * 255)}`;
      const request = createMockRequest({
        "x-forwarded-for": uniqueIp,
      });

      // Act
      const result = checkRateLimit(request);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it("should decrement remaining count on each request", () => {
      const uniqueIp = `192.168.2.${Math.floor(Math.random() * 255)}`;

      const result1 = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      const result2 = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      const result3 = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(98);
      expect(result3.remaining).toBe(97);
    });

    it("should block request after 100 requests", () => {
      // Arrange - Mock Date.now() for stable timestamp
      const mockNow = 1234567890000;
      vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.3.${Math.floor(Math.random() * 255)}`;

      // Act - Make 100 requests (reaching limit)
      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
        expect(result.allowed).toBe(true);
      }

      // Act - 101st request should be blocked
      const blockedResult = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Assert
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.retryAfter).toBeDefined();
      expect(blockedResult.remaining).toBeUndefined();

      // Cleanup
      vi.restoreAllMocks();
    });

    it("should return retryAfter in seconds when rate limit exceeded", () => {
      // Arrange - Mock Date.now()
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.4.${Math.floor(Math.random() * 255)}`;

      // Consume all 100 requests
      for (let i = 0; i < 100; i++) {
        checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      }

      // Act - Request after limit
      const result = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      // retryAfter should be 24 hours in seconds (86400)
      expect(result.retryAfter).toBe(86400);

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should track different IPs independently", () => {
      const ip1 = `192.168.5.${Math.floor(Math.random() * 255)}`;
      const ip2 = `192.168.6.${Math.floor(Math.random() * 255)}`;

      // Make 2 requests from IP1
      checkRateLimit(createMockRequest({ "x-forwarded-for": ip1 }));
      const result1 = checkRateLimit(createMockRequest({ "x-forwarded-for": ip1 }));

      // Make 1 request from IP2
      const result2 = checkRateLimit(createMockRequest({ "x-forwarded-for": ip2 }));

      // Each IP should have independent counters
      expect(result1.remaining).toBe(98); // IP1 made 2 requests
      expect(result2.remaining).toBe(99); // IP2 made 1 request
    });
  });

  // ============================================================================
  // Window Reset
  // ============================================================================

  describe("window reset", () => {
    it("should reset count after 24 hour window expires", () => {
      // Arrange - Mock Date.now()
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.7.${Math.floor(Math.random() * 255)}`;

      // Consume all 100 requests
      for (let i = 0; i < 100; i++) {
        checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      }

      // Verify blocked
      const blockedResult = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      expect(blockedResult.allowed).toBe(false);

      // Act - Advance time by 24 hours + 1 second
      const twentyFourHoursLater = mockNow + 24 * 60 * 60 * 1000 + 1000;
      dateNowSpy.mockReturnValue(twentyFourHoursLater);

      // Try again after window reset
      const afterResetResult = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Assert - Should be allowed again with fresh limit
      expect(afterResetResult.allowed).toBe(true);
      expect(afterResetResult.remaining).toBe(99);

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should not reset count before 24 hour window expires", () => {
      // Arrange
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.8.${Math.floor(Math.random() * 255)}`;

      // Consume all requests
      for (let i = 0; i < 100; i++) {
        checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      }

      // Act - Advance time by 23 hours (before window expires)
      const twentyThreeHoursLater = mockNow + 23 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(twentyThreeHoursLater);

      const result = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Assert - Still blocked
      expect(result.allowed).toBe(false);

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should calculate correct retryAfter time as window progresses", () => {
      // Arrange
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.9.${Math.floor(Math.random() * 255)}`;

      // Consume all requests
      for (let i = 0; i < 100; i++) {
        checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      }

      // Check immediately after limit
      const result1 = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      expect(result1.retryAfter).toBe(86400); // 24 hours

      // Act - Advance by 1 hour
      const oneHourLater = mockNow + 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(oneHourLater);

      const result2 = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Assert - Should be 23 hours remaining
      expect(result2.retryAfter).toBe(82800); // 23 hours in seconds

      // Cleanup
      dateNowSpy.mockRestore();
    });
  });

  // ============================================================================
  // Response Creation
  // ============================================================================

  describe("createRateLimitResponse", () => {
    it("should create 429 response with correct status", () => {
      // Act
      const response = createRateLimitResponse(3600);

      // Assert
      expect(response.status).toBe(429);
    });

    it("should include Retry-After header", () => {
      const retryAfter = 7200;
      const response = createRateLimitResponse(retryAfter);

      expect(response.headers.get("Retry-After")).toBe("7200");
    });

    it("should include X-RateLimit-Limit header", () => {
      const response = createRateLimitResponse(3600);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    });

    it("should include X-RateLimit-Reset header with timestamp", () => {
      const mockNow = 1234567890000;
      vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const retryAfter = 3600; // 1 hour
      const response = createRateLimitResponse(retryAfter);

      const expectedReset = mockNow + retryAfter * 1000;
      expect(response.headers.get("X-RateLimit-Reset")).toBe(expectedReset.toString());

      vi.restoreAllMocks();
    });

    it("should include Content-Type application/json header", () => {
      const response = createRateLimitResponse(3600);

      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should have correct JSON body structure", async () => {
      // Arrange
      const retryAfter = 1800;

      // Act
      const response = createRateLimitResponse(retryAfter);
      const body = await response.json();

      // Assert
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("retry_after_seconds");

      expect(body.error).toBe("Rate limit exceeded");
      expect(body.retry_after_seconds).toBe(1800);
      expect(body.message).toContain("1800 seconds");
    });

    it("should format message with retry time", async () => {
      const response = createRateLimitResponse(7200);
      const body = await response.json();

      expect(body.message).toBe("Too many requests. Try again in 7200 seconds");
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("edge cases", () => {
    it("should handle rapid concurrent requests from same IP", () => {
      const uniqueIp = `192.168.10.${Math.floor(Math.random() * 255)}`;

      // Simulate 5 concurrent requests
      const results = Array.from({ length: 5 }, () =>
        checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }))
      );

      // All should be allowed but with decreasing remaining counts
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });

      // Remaining should decrement (though order might vary due to concurrency simulation)
      const remainingCounts = results.map((r) => r.remaining);
      expect(Math.max(...(remainingCounts as number[]))).toBeLessThanOrEqual(99);
      expect(Math.min(...(remainingCounts as number[]))).toBeGreaterThanOrEqual(95);
    });

    it("should handle exactly 100 requests (boundary test)", () => {
      const uniqueIp = `192.168.11.${Math.floor(Math.random() * 255)}`;

      // Make exactly 100 requests
      for (let i = 0; i < 99; i++) {
        checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      }

      // 100th request
      const result100 = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      expect(result100.allowed).toBe(true);
      expect(result100.remaining).toBe(0);

      // 101st should be blocked
      const result101 = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      expect(result101.allowed).toBe(false);
    });

    it("should handle empty X-Forwarded-For header", () => {
      const request = createMockRequest({
        "x-forwarded-for": "",
      });

      const result = checkRateLimit(request);

      // Empty string should still work (will be trimmed)
      expect(result.allowed).toBe(true);
    });

    it("should handle IPv6 addresses in X-Forwarded-For", () => {
      const ipv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
      const request1 = createMockRequest({
        "x-forwarded-for": ipv6,
      });
      const request2 = createMockRequest({
        "x-forwarded-for": ipv6,
      });

      const result1 = checkRateLimit(request1);
      const result2 = checkRateLimit(request2);

      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(98);
    });
  });

  // ============================================================================
  // Cleanup Expired Entries
  // ============================================================================

  describe("cleanupExpiredEntries", () => {
    it("should remove entries older than 24 hours", () => {
      // Arrange - Mock Date.now() for stable timestamps
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      // Create entries for multiple IPs
      const oldIp = `192.168.20.${Math.floor(Math.random() * 255)}`;
      const recentIp = `192.168.21.${Math.floor(Math.random() * 255)}`;

      // Create old entry (created 25 hours ago)
      checkRateLimit(createMockRequest({ "x-forwarded-for": oldIp }));

      // Advance time by 1 hour to create recent entry
      dateNowSpy.mockReturnValue(mockNow + 60 * 60 * 1000);
      checkRateLimit(createMockRequest({ "x-forwarded-for": recentIp }));

      // Act - Advance time by 24 hours from initial timestamp
      const twentyFiveHoursLater = mockNow + 25 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(twentyFiveHoursLater);

      // Run cleanup
      cleanupExpiredEntries();

      // Assert - Old entry should be cleaned, recent should remain
      // Check by making new requests and verifying counters

      // Old IP should have fresh counter (entry was cleaned)
      const oldIpResult = checkRateLimit(createMockRequest({ "x-forwarded-for": oldIp }));
      expect(oldIpResult.remaining).toBe(99); // Fresh start

      // Recent IP should continue its counter (entry still exists)
      const recentIpResult = checkRateLimit(createMockRequest({ "x-forwarded-for": recentIp }));
      expect(recentIpResult.remaining).toBe(98); // Second request

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should not remove entries within 24 hour window", () => {
      // Arrange
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.22.${Math.floor(Math.random() * 255)}`;

      // Create entry
      checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Act - Advance time by 23 hours (still within window)
      const twentyThreeHoursLater = mockNow + 23 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(twentyThreeHoursLater);

      cleanupExpiredEntries();

      // Assert - Entry should still exist
      const result = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      expect(result.remaining).toBe(98); // Second request (entry not cleaned)

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should handle cleanup with no expired entries", () => {
      // Arrange
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.23.${Math.floor(Math.random() * 255)}`;

      // Create recent entry
      checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Act - Run cleanup immediately (no time passed)
      cleanupExpiredEntries();

      // Assert - Should not affect recent entries
      const result = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      expect(result.remaining).toBe(98); // Entry still exists

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should handle cleanup with empty store", () => {
      // Arrange - Use unique IP range to avoid conflicts
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      // Act - Run cleanup on potentially empty store segment
      // (We can't truly empty the global store, but this tests the logic)
      expect(() => cleanupExpiredEntries()).not.toThrow();

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should handle cleanup at exactly 24 hour boundary", () => {
      // Arrange
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const uniqueIp = `192.168.24.${Math.floor(Math.random() * 255)}`;

      // Create entry
      checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));

      // Act - Advance time by exactly 24 hours + 1ms (just past boundary)
      const exactlyTwentyFourHoursLater = mockNow + 24 * 60 * 60 * 1000 + 1;
      dateNowSpy.mockReturnValue(exactlyTwentyFourHoursLater);

      cleanupExpiredEntries();

      // Assert - Entry should be cleaned (age > windowMs)
      const result = checkRateLimit(createMockRequest({ "x-forwarded-for": uniqueIp }));
      expect(result.remaining).toBe(99); // Fresh counter

      // Cleanup
      dateNowSpy.mockRestore();
    });

    it("should handle cleanup with multiple expired entries", () => {
      // Arrange
      const mockNow = 1234567890000;
      const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(mockNow);

      const ip1 = `192.168.25.${Math.floor(Math.random() * 255)}`;
      const ip2 = `192.168.26.${Math.floor(Math.random() * 255)}`;
      const ip3 = `192.168.27.${Math.floor(Math.random() * 255)}`;

      // Create old entries
      checkRateLimit(createMockRequest({ "x-forwarded-for": ip1 }));
      checkRateLimit(createMockRequest({ "x-forwarded-for": ip2 }));
      checkRateLimit(createMockRequest({ "x-forwarded-for": ip3 }));

      // Act - Advance time past 24 hours
      const twentyFiveHoursLater = mockNow + 25 * 60 * 60 * 1000;
      dateNowSpy.mockReturnValue(twentyFiveHoursLater);

      cleanupExpiredEntries();

      // Assert - All should have fresh counters
      const result1 = checkRateLimit(createMockRequest({ "x-forwarded-for": ip1 }));
      const result2 = checkRateLimit(createMockRequest({ "x-forwarded-for": ip2 }));
      const result3 = checkRateLimit(createMockRequest({ "x-forwarded-for": ip3 }));

      expect(result1.remaining).toBe(99);
      expect(result2.remaining).toBe(99);
      expect(result3.remaining).toBe(99);

      // Cleanup
      dateNowSpy.mockRestore();
    });
  });
});
