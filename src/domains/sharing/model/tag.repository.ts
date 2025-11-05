import type { Tag } from "./tag";

/**
 * ITagRepository Interface
 *
 * Defines the contract for persisting and retrieving Tag aggregates.
 * This interface separates the domain from infrastructure concerns.
 *
 * Implementations should handle:
 * - Loading Tag aggregates with their access lists
 * - Saving complete Tag aggregates (with all TagAccess entities)
 * - Handling transactions to ensure data consistency
 */
export interface ITagRepository {
  /**
   * Find a tag by ID
   *
   * Loads the complete tag aggregate including its access list.
   *
   * @param tagId - The tag ID to find
   * @returns The Tag aggregate if found, null otherwise
   * @throws Error if the database query fails
   */
  findById(tagId: string): Promise<Tag | null>;

  /**
   * Save a tag aggregate
   *
   * Persists the tag and all its related data (like access lists).
   * Should handle the complete aggregate state atomically.
   *
   * @param tag - The Tag aggregate to save
   * @throws Error if the save operation fails
   */
  save(tag: Tag): Promise<void>;
}
