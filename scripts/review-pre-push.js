#!/usr/bin/env node
// Pre-push hook: runs Claude Code review on branch diff and blocks push on critical issues.

const { execSync } = require("child_process");

const JSON_SCHEMA = JSON.stringify({
  type: "object",
  properties: {
    has_critical_issues: { type: "boolean" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["critical", "medium", "minor"] },
          file: { type: "string" },
          description: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["severity", "file", "description"],
      },
    },
  },
  required: ["has_critical_issues", "summary", "findings"],
});

const PROMPT = `Review this git diff for critical issues only. Focus on:
- Bugs and logic errors
- Security vulnerabilities
- Data loss risks
- Broken API contracts

Do NOT flag style, naming, or minor improvements. Only set has_critical_issues to true if there are genuine bugs or security problems that must be fixed before merging.`;

// Strip CLAUDECODE env so claude -p doesn't refuse to run inside a Claude session
const cleanEnv = { ...process.env };
delete cleanEnv.CLAUDECODE;

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf-8", env: cleanEnv, ...opts }).trim();
}

function main() {
  // Skip review when pushing from main
  const branch = run("git rev-parse --abbrev-ref HEAD");
  if (branch === "main") {
    process.exit(0);
  }

  // Allow skipping review with environment variable
  if (process.env.SKIP_REVIEW === "1") {
    console.log("Skipping pre-push review (SKIP_REVIEW=1)");
    process.exit(0);
  }

  // Check that claude CLI is available
  try {
    run("which claude");
  } catch {
    console.log("Warning: claude CLI not found, skipping review.");
    process.exit(0);
  }

  // Fetch latest main so the diff is accurate
  try {
    run("git fetch origin main --quiet");
  } catch {
    // ignore fetch failures (e.g. offline)
  }

  // Get diff against latest remote main
  const diff = run("git diff origin/main...HEAD");
  if (!diff) {
    console.log("No diff against origin/main. Skipping review.");
    process.exit(0);
  }

  console.log("Running Claude Code review on branch diff...");

  let reviewRaw;
  try {
    reviewRaw = execSync(
      `claude -p ${shellEscape(PROMPT)} --output-format json --max-turns 2 --json-schema ${shellEscape(JSON_SCHEMA)}`,
      { input: diff, encoding: "utf-8", env: cleanEnv, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
  } catch {
    console.log("Warning: Claude review failed. Allowing push.");
    process.exit(0);
  }

  let review;
  try {
    review = JSON.parse(reviewRaw);
  } catch {
    console.log("Warning: Could not parse Claude output. Allowing push.");
    process.exit(0);
  }

  const result = review.structured_output;
  if (!result) {
    console.log("Warning: Unexpected Claude output format. Allowing push.");
    process.exit(0);
  }

  if (result.has_critical_issues) {
    console.log();
    console.log("==========================================");
    console.log("  Push blocked: critical issues found");
    console.log("==========================================");
    console.log();
    if (result.summary) {
      console.log(result.summary);
      console.log();
    }
    console.log("Critical findings:");
    for (const finding of result.findings) {
      if (finding.severity === "critical") {
        console.log(`  [${finding.file}] ${finding.description}`);
        console.log(`    Suggestion: ${finding.suggestion || "N/A"}`);
        console.log();
      }
    }
    console.log(
      "Fix the issues above and try again, or skip with: SKIP_REVIEW=1 git push"
    );
    process.exit(1);
  }

  console.log(`Review passed: ${result.summary || "No issues found."}`);
  process.exit(0);
}

function shellEscape(str) {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

main();
