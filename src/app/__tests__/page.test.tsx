import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../page";

// Mock scrollIntoView which doesn't exist in jsdom
Element.prototype.scrollIntoView = jest.fn();

// react-markdown is an ESM-only package which Jest cannot import in a
// CommonJS/jsdom environment. We replace it with a simple component that
// renders its children as plain text, which is sufficient for verifying
// that assistant message content is displayed.
jest.mock("react-markdown", () => {
  return function MockReactMarkdown({ children }: { children: string }) {
    return <span>{children}</span>;
  };
});

const TEST_USER_MESSAGE = "Hello";
const TEST_ASSISTANT_RESPONSE = "Bot reply";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function mockFetchStream(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  const reader = {
    read: jest.fn().mockImplementation(() => {
      if (index < chunks.length) {
        return Promise.resolve({ done: false, value: encoder.encode(chunks[index++]) });
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
      expect(screen.getByText("Knowledge Assistant")).toBeInTheDocument();
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

  describe("header branding", () => {
    it("displays Knowledge Assistant as the title", () => {
      render(<Home />);
      expect(screen.getByText("Knowledge Assistant")).toBeInTheDocument();
    });

    it("does not display old Claude Chatbot title", () => {
      render(<Home />);
      expect(screen.queryByText("Claude Chatbot")).not.toBeInTheDocument();
    });

    it("displays rocket emoji beside the title", () => {
      render(<Home />);
      const rocket = screen.getByRole("img", { name: "rocket" });
      expect(rocket).toBeInTheDocument();
      expect(rocket.textContent).toBe("\u{1F680}");
    });

    it("renders emoji and title in the same flex row", () => {
      render(<Home />);
      const rocket = screen.getByRole("img", { name: "rocket" });
      const title = screen.getByText("Knowledge Assistant");
      expect(rocket.parentElement).toBe(title.parentElement);
    });

    it("still displays Powered by Claude subtitle", () => {
      render(<Home />);
      expect(screen.getByText("Powered by Claude")).toBeInTheDocument();
    });
  });

  describe("user interaction", () => {
    it("typing in input updates value", async () => {
      render(<Home />);
      const input = screen.getByPlaceholderText("Type your message...");
      await userEvent.type(input, TEST_USER_MESSAGE);
      expect(input).toHaveValue(TEST_USER_MESSAGE);
    });

    it("submitting form sends POST to /api/chat", async () => {
      const fetchSpy = mockFetchStream([TEST_ASSISTANT_RESPONSE]);
      global.fetch = fetchSpy;

      render(<Home />);
      const input = screen.getByPlaceholderText("Type your message...");
      await userEvent.type(input, TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({ method: "POST" }),
        );
        const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(callBody.messages).toContainEqual(
          expect.objectContaining({ role: "user", content: TEST_USER_MESSAGE }),
        );
      });
    });

    it("clears input after submission", async () => {
      global.fetch = mockFetchStream([TEST_ASSISTANT_RESPONSE]);

      render(<Home />);
      const input = screen.getByPlaceholderText("Type your message...");
      await userEvent.type(input, TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(input).toHaveValue("");
    });

    it("user message appears in chat", async () => {
      global.fetch = mockFetchStream(["Response"]);

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), "My message");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(screen.getByText("My message")).toBeInTheDocument();
    });

    it("assistant response appears after streaming", async () => {
      global.fetch = mockFetchStream([TEST_ASSISTANT_RESPONSE]);

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText(TEST_ASSISTANT_RESPONSE)).toBeInTheDocument();
      });
    });

    it("assembles response from multiple stream chunks", async () => {
      global.fetch = mockFetchStream(["Bot", " re", "ply"]);

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText(TEST_ASSISTANT_RESPONSE)).toBeInTheDocument();
      });
    });

    it("send button is disabled while loading", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

      render(<Home />);
      const input = screen.getByPlaceholderText("Type your message...");
      const button = screen.getByRole("button", { name: "Send" });

      await userEvent.type(input, TEST_USER_MESSAGE);
      await userEvent.click(button);

      expect(button).toBeDisabled();
    });

    it("shows Thinking indicator while waiting for response", async () => {
      // Fetch never resolves, so isLoading is true and no assistant message
      // has been added yet — the "Thinking..." indicator should appear.
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(screen.getByText("Thinking...")).toBeInTheDocument();
    });

    it("preserves conversation history across messages", async () => {
      // First message exchange
      global.fetch = mockFetchStream(["First reply"]);
      render(<Home />);

      await userEvent.type(screen.getByPlaceholderText("Type your message..."), "First message");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText("First reply")).toBeInTheDocument();
      });

      // Second message — the API should receive all prior messages
      const fetchSpy = mockFetchStream(["Second reply"]);
      global.fetch = fetchSpy;

      await userEvent.type(screen.getByPlaceholderText("Type your message..."), "Second message");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText("Second reply")).toBeInTheDocument();
      });

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
      // 3 messages: user "First message", assistant "First reply", user "Second message"
      expect(callBody.messages).toHaveLength(3);
      expect(callBody.messages[0]).toEqual({ role: "user", content: "First message" });
      expect(callBody.messages[1]).toEqual({ role: "assistant", content: "First reply" });
      expect(callBody.messages[2]).toEqual({ role: "user", content: "Second message" });
    });
  });

  describe("error handling", () => {
    it("shows error message when API call fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText("Sorry, something went wrong.")).toBeInTheDocument();
      });
    });

    it("shows error message when API returns non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText("Sorry, something went wrong.")).toBeInTheDocument();
      });
    });

    it("allows retrying after an error", async () => {
      // First attempt fails
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), TEST_USER_MESSAGE);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText("Sorry, something went wrong.")).toBeInTheDocument();
      });

      // Retry succeeds
      global.fetch = mockFetchStream(["Success!"]);

      await userEvent.type(screen.getByPlaceholderText("Type your message..."), "Retry");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() => {
        expect(screen.getByText("Success!")).toBeInTheDocument();
      });
    });
  });

  describe("input validation", () => {
    it("empty input doesn't submit", async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      render(<Home />);
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("whitespace-only input doesn't submit", async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      render(<Home />);
      await userEvent.type(screen.getByPlaceholderText("Type your message..."), "   ");
      await userEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
