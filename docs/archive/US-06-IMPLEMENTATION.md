# US-06: Natal Chart Generation - Implementation Documentation

**Story ID:** US-06  
**Title:** Natal Chart Generation  
**Completion Date:** 2026-02-27  
**Status:** ✅ Completed

---

## Overview

US-06 implements the natal chart generation feature for AstroLogAI. This feature allows users to generate visual representations of their birth charts based on their birth profile data, integrating with astrology-api.io for accurate calculations.

---

## Backend Implementation

### 1. Astrology Service (`backend/src/services/astrology.ts`)

The core service that handles natal chart calculations:

**Features:**
- **astrology-api.io Integration:** Calls the external API for chart calculations
- **Redis Caching:** 24-hour TTL for cached chart results
- **Fallback Calculation:** Generates approximate chart when API is unavailable
- **Bulgarian Translations:** All zodiac signs, aspects, and elements translated

**Key Types:**
```typescript
interface BirthDataInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface NatalChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  rising: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  northNode: PlanetPosition;
  southNode: PlanetPosition;
  chiron: PlanetPosition;
  lilith?: PlanetPosition;
  houses: HouseCusp[];
  aspects: Aspect[];
  elements: { fire: number; earth: number; air: number; water: number };
  modalities: { cardinal: number; fixed: number; mutable: number };
  calculatedAt: string;
  source: string;
}
```

**Key Functions:**
- `calculateNatalChart(birthData)` - Main calculation with caching
- `getCachedChart(birthData)` - Retrieve from cache
- `invalidateChartCache(birthData)` - Clear cache
- `checkAstrologyApiHealth()` - API health check

### 2. Natal Chart Controller (`backend/src/controllers/natalChartController.ts`)

Handles HTTP requests for chart operations:

**Endpoints:**
- `POST /api/v1/birth-chart` - Generate chart for a birth profile
- `GET /api/v1/birth-chart/:profileId` - Get existing chart
- `DELETE /api/v1/birth-chart/:profileId` - Delete chart
- `POST /api/v1/birth-chart/recalculate/:profileId` - Force recalculation

**Error Handling:**
- 401 Unauthorized - User not authenticated
- 404 Not Found - Profile or chart not found
- 500 Internal Error - Calculation failure

### 3. Birth Chart Routes (`backend/src/routes/birthChart.ts`)

Route configuration with authentication and rate limiting:

```typescript
router.post('/', rateLimiter(10, 60), generateNatalChart);
router.get('/:profileId', getNatalChart);
router.delete('/:profileId', deleteNatalChart);
router.post('/recalculate/:profileId', rateLimiter(5, 60), recalculateNatalChart);
```

---

## Frontend Implementation

### 1. Chart Loading Component (`frontend/src/components/chart/chart-loading.tsx`)

Animated loading state with cosmic theme:

**Features:**
- Triple-ring spinner with gradient colors
- Pulsing center star
- Floating particle effect
- Bouncing progress dots
- Customizable messages

### 2. Chart Visualization Component (`frontend/src/components/chart/chart-visualization.tsx`)

Main chart display component:

**Sections:**
1. **Big Three Display:** Sun, Moon, Rising signs prominently shown
2. **Personal Planets:** Mercury through Saturn with positions
3. **Outer Planets:** Uranus, Neptune, Pluto
4. **Special Points:** North/South Node, Chiron
5. **Elements Chart:** Fire, Earth, Air, Water distribution
6. **Modalities Chart:** Cardinal, Fixed, Mutable distribution
7. **Aspects Grid:** Major planetary aspects

**Design System Compliance:**
- Background: #050510 (Cosmic Black)
- Surface: #0A0A1F (Nebula Dark)
- Primary: #8B5CF6 (Stellar Purple)
- Secondary: #EC4899 (Nebula Pink)
- Border radius: 12px-16px

### 3. Chart Page (`frontend/src/app/birth-data/[id]/chart/page.tsx`)

Full page for viewing/generating charts:

**Features:**
- Automatic chart generation on first visit
- Cache status indicator
- Recalculate button
- Error handling with retry
- Integration with birth profiles
- Responsive design

### 4. Updated Components

**Birth Profile Card:** Added "View Chart" button with star icon

**Birth Profile Detail Page:** Added prominent "View Natal Chart" button

---

## Database Integration

The chart data is stored in the `birth_charts` table:

```prisma
model BirthChart {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  birthProfileId    String?   @map("birth_profile_id")
  chartData         Json      @map("chart_data")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

---

## API Flow

```
1. User clicks "View Natal Chart"
2. Frontend checks for existing chart (GET /api/v1/birth-chart/:profileId)
3. If no chart exists, show generate button
4. User clicks "Generate Chart"
5. Backend receives birth profile ID
6. Backend fetches birth profile data
7. Backend calculates chart via astrology service
8. Chart is cached in Redis (24h TTL)
9. Chart is saved to PostgreSQL
10. Frontend displays chart visualization
```

---

## Caching Strategy

**Redis Cache:**
- Key format: `natal_chart:YYYY-MM-DD:HH:MM:lat:lon`
- TTL: 24 hours (86400 seconds)
- Automatic fallback if Redis unavailable

**Database Persistence:**
- Charts stored permanently in PostgreSQL
- Recalculation deletes old chart and creates new one
- Profile updates automatically delete associated chart

---

## Error Handling

**API Errors:**
- Rate limiting on generation endpoints
- Graceful degradation to fallback calculation
- Clear error messages in Bulgarian

**Frontend Errors:**
- Loading states during generation
- Error messages with retry option
- Authentication redirect if needed

---

## Files Created/Modified

### Backend (Created)
- `src/services/astrology.ts` - Core astrology service
- `src/controllers/natalChartController.ts` - Request handlers

### Backend (Modified)
- `src/routes/birthChart.ts` - Route definitions

### Frontend (Created)
- `src/components/chart/chart-loading.tsx` - Loading animation
- `src/components/chart/chart-visualization.tsx` - Chart display
- `src/app/birth-data/[id]/chart/page.tsx` - Chart page

### Frontend (Modified)
- `src/components/birth-data/birth-profile-card.tsx` - Added chart button
- `src/app/birth-data/[id]/page.tsx` - Added chart link

---

## Configuration Required

**Environment Variables:**
```bash
# Backend
ASTROLOGY_API_KEY=your-api-key
ASTROLOGY_API_URL=https://json.astrology-api.io/v1
REDIS_URL=redis://localhost:6379
```

---

## Testing Notes

**Build Verification:**
- ✅ Backend TypeScript compilation
- ✅ Frontend Next.js build
- ✅ No type errors
- ✅ All routes compiled

**Manual Testing Required:**
1. Generate chart with valid birth profile
2. Verify chart displays correctly
3. Test cache hit on second visit
4. Test recalculation
5. Test with unknown birth time
6. Test API fallback behavior

---

## Next Steps

1. **US-07:** Onboarding Tutorial
2. **US-08:** Send Message to AI Astrologer
3. Add chart download as PNG/PDF
4. Add chart share functionality
