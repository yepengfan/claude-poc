const { readFileSync } = require("fs");

const input = JSON.parse(readFileSync("/dev/stdin", "utf-8"));
const filePath =
  input.tool_input?.file_path ?? input.tool_input?.command ?? "";

const blockedPatterns = [
  ".env",
  ".env.local",
  ".env.production",
  ".aws",
  ".ssh",
  "credentials",
  "private_key",
  ".pem",
  ".key",
  "secret",
];

const matched = blockedPatterns.find((p) => filePath.includes(p));

if (matched) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Blocked: cannot access ${matched} files for security reasons`,
      },
    })
  );
  process.exit(2);
}
