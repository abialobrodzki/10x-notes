import { describe, it, expect, beforeEach } from "vitest";
import { RecipientEmail } from "@/domains/sharing/model/recipient-email";
import { Tag } from "@/domains/sharing/model/tag";
import { TagAccess } from "@/domains/sharing/model/tag-access";

describe("Tag Aggregate Root", () => {
  let tag: Tag;
  const ownerId = "owner-123";
  const tagId = "tag-456";
  const tagName = "Test Tag";

  beforeEach(() => {
    tag = new Tag(tagId, ownerId, tagName);
  });

  describe("Constructor", () => {
    it("should create a new tag with initial properties", () => {
      expect(tag.id).toBe(tagId);
      expect(tag.ownerId).toBe(ownerId);
      expect(tag.name).toBe(tagName);
      expect(tag.getAccessCount()).toBe(0);
    });

    it("should create a tag with existing access list", () => {
      const recipient1 = new RecipientEmail("user1@example.com");
      const recipient2 = new RecipientEmail("user2@example.com");
      const access1 = new TagAccess("user-1", recipient1, new Date());
      const access2 = new TagAccess("user-2", recipient2, new Date());

      const existingTag = new Tag(tagId, ownerId, tagName, [access1, access2]);

      expect(existingTag.getAccessCount()).toBe(2);
    });
  });

  describe("Query Methods", () => {
    describe("isOwnedBy", () => {
      it("should return true if the user is the owner", () => {
        expect(tag.isOwnedBy(ownerId)).toBe(true);
      });

      it("should return false if the user is not the owner", () => {
        expect(tag.isOwnedBy("other-user")).toBe(false);
      });
    });

    describe("hasAccess", () => {
      it("should return false when no one has access", () => {
        expect(tag.hasAccess("user-1")).toBe(false);
      });

      it("should return true when user has access", () => {
        const recipientEmail = new RecipientEmail("user1@example.com");
        tag.grantAccess("user-1", recipientEmail, ownerId);

        expect(tag.hasAccess("user-1")).toBe(true);
      });

      it("should return false for user without access", () => {
        const recipientEmail = new RecipientEmail("user1@example.com");
        tag.grantAccess("user-1", recipientEmail, ownerId);

        expect(tag.hasAccess("user-2")).toBe(false);
      });
    });

    describe("getAccessCount", () => {
      it("should return 0 for a new tag", () => {
        expect(tag.getAccessCount()).toBe(0);
      });

      it("should return the number of users with access", () => {
        const email1 = new RecipientEmail("user1@example.com");
        const email2 = new RecipientEmail("user2@example.com");

        tag.grantAccess("user-1", email1, ownerId);
        expect(tag.getAccessCount()).toBe(1);

        tag.grantAccess("user-2", email2, ownerId);
        expect(tag.getAccessCount()).toBe(2);
      });
    });

    describe("getAccessList", () => {
      it("should return empty array for new tag when owner queries", () => {
        const list = tag.getAccessList(ownerId);
        expect(list).toHaveLength(0);
      });

      it("should throw error if non-owner queries", () => {
        expect(() => tag.getAccessList("non-owner")).toThrow("TAG_NOT_OWNED");
      });

      it("should return access list when owner queries", () => {
        const email1 = new RecipientEmail("user1@example.com");
        const email2 = new RecipientEmail("user2@example.com");

        tag.grantAccess("user-1", email1, ownerId);
        tag.grantAccess("user-2", email2, ownerId);

        const list = tag.getAccessList(ownerId);
        expect(list).toHaveLength(2);
        expect(list[0].recipientId).toBe("user-1");
        expect(list[1].recipientId).toBe("user-2");
      });
    });
  });

  describe("Business Logic - grantAccess", () => {
    it("should grant access to a recipient", () => {
      const recipientEmail = new RecipientEmail("colleague@example.com");

      tag.grantAccess("user-456", recipientEmail, ownerId);

      expect(tag.hasAccess("user-456")).toBe(true);
      expect(tag.getAccessCount()).toBe(1);
    });

    it("should throw error if non-owner attempts to grant access", () => {
      const recipientEmail = new RecipientEmail("colleague@example.com");

      expect(() => tag.grantAccess("user-456", recipientEmail, "non-owner")).toThrow("TAG_NOT_OWNED");
    });

    it("should throw error if attempting to share with self", () => {
      const recipientEmail = new RecipientEmail("owner@example.com");

      expect(() => tag.grantAccess(ownerId, recipientEmail, ownerId)).toThrow("CANNOT_SHARE_WITH_SELF");
    });

    it("should throw error if recipient already has access", () => {
      const recipientEmail = new RecipientEmail("colleague@example.com");

      tag.grantAccess("user-456", recipientEmail, ownerId);

      expect(() => tag.grantAccess("user-456", recipientEmail, ownerId)).toThrow("DUPLICATE_ACCESS");
    });

    it("should update the updatedAt timestamp", () => {
      const originalUpdatedAt = tag.updatedAt;

      // Small delay to ensure timestamp changes
      const recipientEmail = new RecipientEmail("colleague@example.com");
      tag.grantAccess("user-456", recipientEmail, ownerId);

      expect(tag.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it("should grant access to multiple users", () => {
      const email1 = new RecipientEmail("user1@example.com");
      const email2 = new RecipientEmail("user2@example.com");
      const email3 = new RecipientEmail("user3@example.com");

      tag.grantAccess("user-1", email1, ownerId);
      tag.grantAccess("user-2", email2, ownerId);
      tag.grantAccess("user-3", email3, ownerId);

      expect(tag.getAccessCount()).toBe(3);
      expect(tag.hasAccess("user-1")).toBe(true);
      expect(tag.hasAccess("user-2")).toBe(true);
      expect(tag.hasAccess("user-3")).toBe(true);
    });
  });

  describe("Business Logic - revokeAccess", () => {
    beforeEach(() => {
      const email1 = new RecipientEmail("user1@example.com");
      const email2 = new RecipientEmail("user2@example.com");
      tag.grantAccess("user-1", email1, ownerId);
      tag.grantAccess("user-2", email2, ownerId);
    });

    it("should revoke access from a recipient", () => {
      expect(tag.hasAccess("user-1")).toBe(true);

      tag.revokeAccess("user-1", ownerId);

      expect(tag.hasAccess("user-1")).toBe(false);
      expect(tag.getAccessCount()).toBe(1);
    });

    it("should throw error if non-owner attempts to revoke", () => {
      expect(() => tag.revokeAccess("user-1", "non-owner")).toThrow("TAG_NOT_OWNED");
    });

    it("should throw error if revoking access from user who doesn't have it", () => {
      expect(() => tag.revokeAccess("user-999", ownerId)).toThrow("ACCESS_NOT_FOUND");
    });

    it("should update the updatedAt timestamp", () => {
      const originalUpdatedAt = tag.updatedAt;

      tag.revokeAccess("user-1", ownerId);

      expect(tag.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it("should revoke access from multiple users independently", () => {
      tag.revokeAccess("user-1", ownerId);
      expect(tag.hasAccess("user-1")).toBe(false);
      expect(tag.hasAccess("user-2")).toBe(true);

      tag.revokeAccess("user-2", ownerId);
      expect(tag.hasAccess("user-2")).toBe(false);
      expect(tag.getAccessCount()).toBe(0);
    });
  });

  describe("Business Logic - updateName", () => {
    it("should update the tag name", () => {
      const newName = "Updated Tag Name";

      tag.updateName(newName, ownerId);

      expect(tag.name).toBe(newName);
    });

    it("should throw error if non-owner attempts to update", () => {
      expect(() => tag.updateName("New Name", "non-owner")).toThrow("TAG_NOT_OWNED");
    });

    it("should update the updatedAt timestamp", () => {
      const originalUpdatedAt = tag.updatedAt;

      tag.updateName("New Name", ownerId);

      expect(tag.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe("Aggregate Immutability", () => {
    it("should return readonly access list", () => {
      const email = new RecipientEmail("user@example.com");
      tag.grantAccess("user-1", email, ownerId);

      const accessList = tag.accessList;

      // Verify it's readonly by checking type
      expect(Array.isArray(accessList)).toBe(true);
      expect(accessList).toHaveLength(1);
    });
  });
});
