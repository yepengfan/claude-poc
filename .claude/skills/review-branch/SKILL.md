---
name: review-branch
description: Review the current branch's changes against main. Use this to get a local code review before pushing or creating a PR.
---

Review the changes on the current branch compared to the main branch.

First, run `git diff main...HEAD` to get the full diff, and `git log main..HEAD --oneline` to see the commit history. Also read any changed files in full to understand the context around the changes.

Then provide a thorough code review using this format:

## Summary
A concise summary of what this branch does and why.

## Changes
A bullet-point breakdown of the key changes, organized by file or feature area.

## Code Review

### Strengths
Highlight what's done well (good patterns, thorough coverage, clean code, etc.)

### Issues & Suggestions
Review the code for:
- Bugs or logic errors
- Security vulnerabilities
- Performance concerns
- Code style and best practices
- Missing edge cases or error handling
- Test coverage gaps

Categorize each issue by severity:
- 🔴 **Critical**: Must fix before merging (bugs, security issues, data loss risks)
- 🟡 **Medium**: Should fix (code quality, maintainability, missing validation)
- 🟢 **Minor**: Nice to have (style, documentation, optional improvements)

For each issue, include:
1. The file and line number
2. What the problem is
3. A concrete suggestion or code snippet showing the fix

### Security
Note any security considerations or confirm none were found.

### Performance
Note any performance concerns or confirm none were found.

## Recommendation
State one of: **Approve**, **Approve with suggestions**, or **Request changes**, with a brief explanation.

If this branch has been updated since a previous review, focus on the new changes while keeping the overall review current.
