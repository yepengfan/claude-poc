"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_INPUT_LENGTH = 500;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTruncationWarning, setShowTruncationWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setShowTruncationWarning(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error("Failed to fetch response");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        const content = assistantContent;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <header className="border-b border-foreground/10 px-4 py-3">
        <h1 className="text-center text-lg font-semibold">Claude Chatbot</h1>
        <p className="text-center text-sm text-foreground/60">Powered by Claude</p>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-foreground/40 mt-20">
              Send a message to start chatting.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-sky-200 text-foreground"
                    : "bg-foreground/5 text-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-foreground/5 px-4 py-2 text-foreground/40">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-foreground/10 p-4 flex gap-2"
        >
          <div className="flex flex-1 flex-col gap-1">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw.length > MAX_INPUT_LENGTH) {
                  setInput(raw.slice(0, MAX_INPUT_LENGTH));
                  setShowTruncationWarning(true);
                } else {
                  setInput(raw);
                  setShowTruncationWarning(false);
                }
              }}
              placeholder="Type your message..."
              className="flex-1 rounded-xl border border-foreground/20 bg-background px-4 py-2 text-foreground outline-none focus:border-foreground/40"
              disabled={isLoading}
            />
            <div className="flex justify-between">
              {showTruncationWarning ? (
                <span className="text-xs text-red-500" role="alert">
                  Message truncated to {MAX_INPUT_LENGTH} characters
                </span>
              ) : (
                <span />
              )}
              <span className={`text-xs ${input.length >= MAX_INPUT_LENGTH ? "text-red-500" : "text-foreground/40"}`}>
                {input.length}/{MAX_INPUT_LENGTH}
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-foreground px-5 py-2 text-background transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
