import { NextRequest } from "next/server";
import { eventEmitter } from "@/lib/services/eventEmitter";

/**
 * SSE Endpoint: /api/events
 * 
 * Keep-alive connection for real-time updates.
 * Clients (KDS, Waiter, Customer) connect here to receive live events.
 */
export async function GET(req: NextRequest) {
    const stream = new ReadableStream({
        start(controller) {
            // Send initial ping to establish connection
            controller.enqueue(`data: ${JSON.stringify({ event: 'connected', timestamp: Date.now() })}\n\n`);

            // Listen for global events
            const unsubscribe = eventEmitter.subscribe((data) => {
                controller.enqueue(`data: ${data}\n\n`);
            });

            // Keep connection alive with pings every 25s
            const keepAlive = setInterval(() => {
                controller.enqueue(`: ping\n\n`);
            }, 25000);

            // Cleanup on close
            req.signal.onabort = () => {
                clearInterval(keepAlive);
                unsubscribe();
            };
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    });
}
