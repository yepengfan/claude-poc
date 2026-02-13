import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../page";

// Mock scrollIntoView which doesn't exist in jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock TextDecoder for jsdom environment
global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: (value: string) => value,
})) as unknown as typeof TextDecoder;

// Mock react-markdown to avoid ESM issues in Jest
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <span>{children}</span>;
  };
});

function mockFetchStream(text: string) {
  let called = false;
  const reader = {
    read: jest.fn().mockImplementation(() => {
      if (!called) {
        called = true;
        return Promise.resolve({ done: false, value: text });
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
  };

  return jest.fn().mockResolvedValue({
    ok: true,
    body: { getReader: () => reader },
  });
}

describe("Home page", () => {
  describe("rendering", () => {
    it("shows header with title", () => {
      render(<Home />);
      expect(screen.getByText("Claude Chatbot")).toBeInTheDocument();
    });

    it("shows empty state message", () => {
      render(<Home />);
      expect(screen.getByText("Send a message to start chatting.")).toBeInTheDocument();
    });

    it("has input and send button", () => {
      render(<Home />);
      expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    });
  });

  describe("user interaction", () => {
    it("typing in input updates value", async () => {
      render(<Home />);
      const input = screen.getByPlaceholderText("Type your message...");
      await userEvent.type(input, "Hello");
      expect(input).toHaveValue("Hello");
    });

    it("submitting form sends POST to /api/chat", async () => {
      const fetchSpy = mockFetchStream("Hi there!");
      global.fetch = fetchSpy;

      render(<Home />);
      const input = screen.getByPlaceholderText("Type your message...");
      await userEvent.type(input, "Hello");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining('"Hello"'),
        });
      });
    });

    it("user message appears in chat", async () => {
      global.fetch = mockFetchStream("Response");

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), "My message");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(screen.getByText("My message")).toBeInTheDocument();
    });

    it("assistant response appears after streaming", async () => {
      global.fetch = mockFetchStream("Bot reply");

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), "Hi");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText("Bot reply")).toBeInTheDocument();
      });
    });

    it("send button is disabled while loading", async () => {
      // Use a fetch that never resolves to keep loading state
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

      render(<Home />);
      const input = screen.getByPlaceholderText("Type your message...");
      const button = screen.getByRole("button", { name: "Send" });

      await userEvent.type(input, "Hello");
      await userEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it("empty input doesn't submit", async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      render(<Home />);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
