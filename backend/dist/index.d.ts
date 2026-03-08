/**
 * AstroLogAI Backend API Server
 * Main entry point
 *
 * US-10: WebSocket support via Socket.io
 */
import { Express } from 'express';
declare const app: Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: import("socket.io").Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export default app;
export { httpServer, io };
//# sourceMappingURL=index.d.ts.map