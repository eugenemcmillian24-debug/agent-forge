type SSEEvent = Record<string, unknown>;

/**
 * Creates a Server-Sent Events (SSE) streaming response.
 *
 * Includes a 15-second keepalive heartbeat so Cloudflare's 100s idle timeout
 * doesn't kill long-running agent generation streams.
 */
export function createSSEStream(
  handler: (emit: (event: SSEEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const emit = (event: SSEEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // Keepalive: send a comment ping every 15s to prevent proxy timeouts
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          // Stream already closed — stop the interval
          clearInterval(heartbeat);
        }
      }, 15_000);

      try {
        await handler(emit);
        emit({ type: "done" });
      } catch (err) {
        emit({ type: "error", message: String(err) });
      } finally {
        closed = true;
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering for SSE
    },
  });
}
