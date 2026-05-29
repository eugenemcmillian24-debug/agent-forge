type SSEEvent = Record<string, unknown>;
export function createSSEStream(handler: (emit: (event: SSEEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SSEEvent) => { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); };
      try { await handler(emit); emit({ type: "done" }); }
      catch (err) { emit({ type: "error", message: String(err) }); }
      finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
}
