/**
 * LLM Provider Status Routes
 *
 * Exposes agent framework health info for monitoring dashboards.
 * The actual inference runs via Vercel AI SDK in services/llm.ts.
 *
 * GET /api/v1/providers/status  — provider overview
 * GET /api/v1/llm/health        — health check alias
 * GET /api/v1/llm/status        — status alias
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=llm.d.ts.map