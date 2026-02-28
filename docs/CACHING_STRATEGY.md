# Astrology Chart Caching Strategy

## Overview

The AstrologAAI backend implements a dual-key caching strategy for natal chart calculations to optimize API usage and improve response times.

## Problem with Previous Approach

### Legacy Caching (Before Optimization)

**Cache Key Format:**
```
natal_chart:{year}-{month}-{day}:{hour}:{minute}:{latitude}:{longitude}
```

**Example:**
```
natal_chart:1990-5-15:14:30:42.6977:23.3219
```

**Issues:**
- **Low Cache Hit Rate:** Each unique birth minute creates a separate cache entry
- **Short TTL:** 24-hour expiration meant frequent cache misses
- **Inefficient:** Two people born 1 minute apart would have separate cache entries even if planetary positions were identical
- **API Cost:** More API calls to astrology-api.io than necessary

## New Approach: Position-Based Caching

### Key Insight

In astrology, what matters for chart interpretation is:
- **Planetary positions** (which sign + degree)
- **House cusps** (which sign on each house)
- **Aspects** (angles between planets)

NOT the exact birth minute.

### New Cache Key Format

**Position-Based Key:**
```
chart_pos:{planet}:{sign}{degree}|{planet}:{sign}{degree}|...
```

**Example:**
```
chart_pos:Sun:Cap20|Moon:Leo12|Mer:Cap5|Ven:Pis18|Mar:Ari8|Jup:Leo22|Sat:Cap15|Ura:Cap10|Nep:Cap18|Plu:Sag10|Asc:Sco5|MC:Leo25
```

**Components:**
- **10 Major Planets:** Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- **Angles:** Ascendant (Asc), Midheaven (MC)
- **Format:** `{abbreviation}:{sign_abbrev}{rounded_degree}`
- **Degree Rounding:** Nearest whole degree to avoid precision issues

### Benefits

1. **Higher Cache Hit Rate**
   - Users born at different times but with same planetary positions share cache
   - Example: Two people born 30 minutes apart might have identical planetary positions

2. **Longer TTL**
   - Changed from 24 hours to **30 days**
   - Planetary positions don't change, so cache remains valid

3. **Reduced API Costs**
   - Fewer calls to astrology-api.io
   - Better resource utilization

4. **Faster Response Times**
   - More cache hits = faster responses
   - Better user experience

## Implementation Details

### Dual-Key Strategy

The system maintains **both** cache keys for backward compatibility:

```typescript
// 1. Calculate chart from API
const chart = await fetchChartFromAPI(birthData);

// 2. Generate position-based key
const positionKey = generatePositionBasedCacheKey(chart);
await redis.setEx(positionKey, 2592000, chart); // 30 days

// 3. Also cache with legacy key
const legacyKey = generateCacheKey(birthData);
await redis.setEx(legacyKey, 86400, chart); // 24 hours
```

### Lookup Flow

```
User Request
    ↓
Check Legacy Cache (backward compatibility)
    ↓ (miss)
Call Astrology API
    ↓
Generate Position-Based Key
    ↓
Check Position Cache (might exist from another user)
    ↓ (miss)
Store with Both Keys
    ↓
Return Chart
```

### Cache Key Generation

**Abbreviations Used:**

**Planets:**
- Sun → Sun
- Moon → Moon
- Mercury → Mer
- Venus → Ven
- Mars → Mar
- Jupiter → Jup
- Saturn → Sat
- Uranus → Ura
- Neptune → Nep
- Pluto → Plu

**Signs:**
- Aries → Ari
- Taurus → Tau
- Gemini → Gem
- Cancer → Can
- Leo → Leo
- Virgo → Vir
- Libra → Lib
- Scorpio → Sco
- Sagittarius → Sag
- Capricorn → Cap
- Aquarius → Aqu
- Pisces → Pis

### Example Scenarios

**Scenario 1: Same Positions, Different Times**
```
Person A: Born 1990-05-15 14:30
Person B: Born 1990-05-15 14:45

Both have:
- Sun at Capricorn 20°
- Moon at Leo 12°
- etc.

Result: Both get SAME position-based cache key
Cache hit for Person B!
```

**Scenario 2: Different Positions**
```
Person A: Born 1990-05-15 (Sun at Cap 20°)
Person B: Born 1990-05-16 (Sun at Cap 21°)

Result: Different position-based cache keys
Both require API calls (different charts)
```

## Migration Path

### Phase 1: Dual Caching (Current)
- Maintain both legacy and position-based keys
- Legacy keys: 24-hour TTL
- Position keys: 30-day TTL
- No breaking changes

### Phase 2: Gradual Migration (Future)
- Monitor cache hit rates
- Identify when legacy keys are no longer needed
- Consider removing legacy cache after transition period

### Phase 3: Position-Only (Future)
- Remove legacy cache generation
- Keep only position-based caching
- Simplify codebase

## Monitoring & Metrics

### Key Metrics to Track

1. **Cache Hit Rate**
   - Legacy cache hits
   - Position cache hits
   - Overall hit rate improvement

2. **API Call Reduction**
   - Before/after comparison
   - Cost savings

3. **Response Time**
   - Average response time
   - Cache hit vs cache miss times

### Redis Commands for Monitoring

```bash
# Count position-based keys
redis-cli KEYS "chart_pos:*" | wc -l

# Count legacy keys
redis-cli KEYS "natal_chart:*" | wc -l

# Check TTL of a specific key
redis-cli TTL "chart_pos:Sun:Cap20|Moon:Leo12|..."

# Sample key
redis-cli GET "chart_pos:Sun:Cap20|Moon:Leo12|..."
```

## Testing

Test file: `backend/src/services/__tests__/cache-key.test.ts`

**Test Cases:**
1. ✅ Same positions generate same key
2. ✅ Different positions generate different keys
3. ✅ Degree rounding works correctly
4. ✅ All planets included in key
5. ✅ Proper key format

**Run Tests:**
```bash
cd backend
npm test -- cache-key.test.ts
```

## Configuration

### Environment Variables

No new environment variables required. Uses existing:
- `REDIS_URL` - Redis connection
- `ASTROLOGY_API_KEY` - API authentication

### Cache TTL Constants

```typescript
const CHART_CACHE_TTL = 2592000;        // 30 days (position-based)
const CHART_CACHE_TTL_LEGACY = 86400;   // 24 hours (legacy)
```

## Best Practices

1. **Monitor Cache Size**
   - Position keys are longer but more valuable
   - Monitor Redis memory usage

2. **Cache Invalidation**
   - Use `invalidateChartCache()` for legacy keys
   - Position keys self-expire after 30 days

3. **Error Handling**
   - Cache failures should not break chart generation
   - Always have fallback to API

## Conclusion

The position-based caching strategy significantly improves:
- ⚡ **Performance:** Higher cache hit rate = faster responses
- 💰 **Cost:** Fewer API calls = lower costs
- 🔄 **Efficiency:** Better resource utilization
- 👥 **Scalability:** Shared cache across users with similar charts

This approach aligns with the astrological principle that **planetary positions matter, not exact birth minutes**.

---

**Last Updated:** 2026-02-28  
**Author:** Lorenzo (AI Assistant)  
**Version:** 2.0 (Position-Based Caching)
