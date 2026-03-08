/**
 * Tests for Aspect-Based Caching Strategy
 *
 * Verifies that:
 * 1. computeAspects() correctly identifies major aspects
 * 2. generateAspectCacheKey() produces consistent keys for similar aspects
 * 3. Charts with different aspects produce different keys
 * 4. Orb bucket logic works correctly
 */
export {};
/**
 * Manual Test Cases
 *
 * To verify the implementation manually:
 *
 * 1. Create two charts with similar aspects:
 *    - Chart A: Born 1990-01-15 14:30 Sofia
 *    - Chart B: Born 1990-01-15 14:35 Sofia (5 min later)
 *    - Expected: Same aspect cache key (aspects don't change in 5 min)
 *
 * 2. Create two charts with different aspects:
 *    - Chart A: Born 1990-01-15 14:30 Sofia
 *    - Chart B: Born 1990-06-15 14:30 Sofia (6 months later)
 *    - Expected: Different aspect cache keys
 *
 * 3. Verify TTLs:
 *    - Layer 1 (aspect): Check Redis TTL is ~90 days
 *    - Layer 2 (position): Check Redis TTL is ~30 days
 *    - Layer 3 (legacy): Check Redis TTL is ~24 hours
 */
/**
 * Redis Verification Commands
 *
 * After running the service, verify caching with:
 *
 * # List all aspect-pattern cache keys
 * redis-cli KEYS "natal_aspect_v1:*"
 *
 * # Check TTL of a specific key
 * redis-cli TTL "natal_aspect_v1:abc123..."
 *
 * # List all position-based cache keys
 * redis-cli KEYS "chart_pos:*"
 *
 * # List all legacy cache keys
 * redis-cli KEYS "natal_chart:*"
 *
 * # Count cache keys by type
 * redis-cli KEYS "natal_aspect_v1:*" | wc -l
 * redis-cli KEYS "chart_pos:*" | wc -l
 * redis-cli KEYS "natal_chart:*" | wc -l
 */
//# sourceMappingURL=aspect-caching.test.d.ts.map