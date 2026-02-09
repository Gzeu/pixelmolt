# PixelMolt - Task Queue pentru Sub-agenți

## 🎯 Obiective Principale
1. **Canvas full-screen** - scoate UI fix, adaptează la viewport
2. **Sync Moltbook agents** - scrape număr agenți din pagină
3. **MCP API registration** - înregistrare model context protocol
4. **Daily theme system** - teme care se schimbă zilnic
5. **Skill instructions** - documentație pentru alți agenți

---

## TASK 1: Full-Screen Canvas Improvements
**Priority:** HIGH
**Estimate:** 30 min

### Changes needed in `src/components/Canvas/PixelGrid.tsx`:
1. Remove hardcoded MOLTBOOK_AGENTS constant
2. Fetch real count from `/api/moltbook/agents`
3. Canvas should fill 100% viewport
4. Hide scrollbars
5. Auto-fit on load

### Code changes:
```tsx
// Remove this:
const MOLTBOOK_AGENTS = 2031691;
const CANVAS_SIZE = Math.ceil(Math.sqrt(MOLTBOOK_AGENTS));

// Replace with dynamic fetch in useEffect
```

---

## TASK 2: Moltbook Agent Count Scraper
**Priority:** HIGH  
**Estimate:** 20 min

### Create: `src/app/api/moltbook/agents/route.ts`
```typescript
// Scrape from www.moltbook.com or API
// GET https://www.moltbook.com/api/v1/stats
// Return: { count: number, lastUpdated: timestamp }
```

### API endpoint needed:
- GET `/api/moltbook/agents` → returns agent count
- Cache for 1 hour (don't spam Moltbook)

---

## TASK 3: MCP Server Registration
**Priority:** MEDIUM
**Estimate:** 45 min

### Files to create:
- `mcp/server.ts` - MCP server implementation
- `mcp/tools.ts` - Tool definitions
- `package.json` - add mcp dependencies

### MCP Tools to expose:
1. `pixelmolt_place_pixel` - Place a pixel
2. `pixelmolt_get_canvas` - Get canvas state
3. `pixelmolt_get_leaderboard` - Get rankings
4. `pixelmolt_get_stats` - Get canvas stats

### Registration:
- OpenClaw MCP config in `openclaw.json`
- Or standalone MCP server on port 3101

---

## TASK 4: Daily Theme System
**Priority:** MEDIUM
**Estimate:** 40 min

### Create: `src/lib/themes/daily.ts`
```typescript
interface DailyTheme {
  date: string;
  name: string;
  description: string;
  suggestedColors: string[];
  bonusMultiplier: number; // extra points for using theme colors
  featuredArea?: { x: number, y: number, size: number };
}
```

### Theme ideas:
- Monday: "Ocean Blues" - blues/cyans
- Tuesday: "Fire & Ice" - reds vs blues
- Wednesday: "Nature" - greens/browns
- Thursday: "Neon Night" - bright neons
- Friday: "Gold Rush" - yellows/golds
- Saturday: "Pixel War" - free for all
- Sunday: "Sunset" - oranges/purples

### API endpoint:
- GET `/api/theme/today` → current theme
- Bonus points for using theme colors

---

## TASK 5: Skill Documentation
**Priority:** LOW
**Estimate:** 30 min

### Create: `skills/pixelmolt/SKILL.md`
```markdown
# PixelMolt Skill

## Description
Interact with PixelMolt canvas - place pixels, check leaderboard, collaborate on art.

## API Reference
- POST /api/pixel - Place pixel
- GET /api/canvas/default - Get canvas
- GET /api/leaderboard - Rankings
- GET /api/points - Point system
- GET /api/theme/today - Daily theme

## Examples
[code examples for agents]
```

---

## Sub-Agent Assignment

### Agent 1: UI/Frontend
- Task 1: Full-screen canvas
- Modify PixelGrid.tsx
- Test responsiveness

### Agent 2: Backend/API
- Task 2: Moltbook scraper
- Task 4: Theme system
- Create new API routes

### Agent 3: Integration
- Task 3: MCP server
- Task 5: Skill docs
- Test with OpenClaw

---

## Quick Commands

```powershell
# Start dev server
cd projects/pixelmolt; npm run dev

# Test pixel placement
Invoke-RestMethod -Uri "http://localhost:3100/api/pixel" -Method POST -Body '{"canvasId":"default","x":50,"y":50,"color":"#FF0000","agentId":"test"}' -ContentType "application/json"

# Get leaderboard
Invoke-RestMethod -Uri "http://localhost:3100/api/leaderboard"

# Get stats
Invoke-RestMethod -Uri "http://localhost:3100/api/stats"
```

---

## Files Reference

| Task | Files to modify/create |
|------|------------------------|
| Full-screen | `src/components/Canvas/PixelGrid.tsx`, `src/app/globals.css` |
| Moltbook sync | `src/app/api/moltbook/agents/route.ts`, `src/lib/moltbook/sync.ts` |
| MCP | `mcp/server.ts`, `mcp/tools.ts`, `package.json` |
| Themes | `src/lib/themes/daily.ts`, `src/app/api/theme/route.ts` |
| Skill | `skills/pixelmolt/SKILL.md` |

---

*Generated: 2026-02-09 04:59*
