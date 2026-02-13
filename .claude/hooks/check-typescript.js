const { execSync } = require("child_process");

const projectDir = process.env.CLAUDE_PROJECT_DIR;

try {
  execSync("npx tsc --noEmit", {
    cwd: projectDir,
    stdio: "pipe",
    timeout: 30000,
  });
} catch (error) {
  const stderr = error.stderr?.toString() || "";
  const stdout = error.stdout?.toString() || "";
  const output = stdout || stderr;

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        message: `TypeScript errors detected:\n${output}`,
      },
    })
  );
  process.exit(2);
}
