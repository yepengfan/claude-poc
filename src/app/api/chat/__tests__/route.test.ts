/**
 * @jest-environment node
 *
 * API routes run in Node.js, not the browser, so we override the default
 * jsdom environment to get access to Node globals like Request and Response.
 */
import { POST } from "../route";
import { CHAT_MODEL, MAX_TOKENS } from "../model";
import Anthropic from "@anthropic-ai/sdk";

interface MockAnthropicConstructor {
  new (): Anthropic;
  __streamFn: jest.Mock;
}

jest.mock("@anthropic-ai/sdk", () => {
  const streamFn = jest.fn();

  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { stream: streamFn },
  }));

  (MockAnthropic as unknown as MockAnthropicConstructor).__streamFn = streamFn;

  return MockAnthropic;
});

function createMockStream() {
  return {
    async *[Symbol.asyncIterator]() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: " world" } };
      yield { type: "ping" }; // non-text event, should be skipped
    },
  };
}

const streamFn = (Anthropic as unknown as MockAnthropicConstructor).__streamFn;

describe("POST /api/chat", () => {
  beforeEach(() => {
    streamFn.mockClear();
    streamFn.mockReturnValue(createMockStream());
  });

  it("returns a streaming response with correct content-type", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
    });

    const res = await POST(req);

    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.body).toBeInstanceOf(ReadableStream);
  });

  it("streams text deltas from the Anthropic SDK", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
    });

    const res = await POST(req);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }

    expect(result).toBe("Hello world");
  });

  it("passes messages from request body to the SDK", async () => {
    const messages = [
      { role: "user", content: "What is 2+2?" },
    ];

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    await POST(req);

    expect(streamFn).toHaveBeenCalledWith({
      model: CHAT_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
    });
  });

  it("throws on invalid request body", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    await expect(POST(req)).rejects.toThrow();
  });

  it("propagates SDK stream errors", async () => {
    streamFn.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        throw new Error("Anthropic API error");
      },
    });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
    });

    const res = await POST(req);
    const reader = res.body!.getReader();

    await expect(reader.read()).rejects.toThrow("Anthropic API error");
  });
});
