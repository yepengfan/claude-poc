import Anthropic from "@anthropic-ai/sdk";
import { CHAT_MODEL, MAX_TOKENS } from "./model";

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = anthropic.messages.stream({
    model: CHAT_MODEL,
    max_tokens: MAX_TOKENS,
    messages,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
