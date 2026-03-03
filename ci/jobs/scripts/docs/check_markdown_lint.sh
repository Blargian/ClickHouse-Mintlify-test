#!/usr/bin/env bash
#
# Wrapper around markdownlint-cli2 that groups errors by rule for readability.
# Runs from the repository root.
#
# Usage:
#   ci/jobs/scripts/docs/check_markdown_lint.sh

set -uo pipefail

cd docs || { echo "Error: docs/ directory not found"; exit 1; }

raw_output=$(markdownlint-cli2 --config styles/.markdownlint-cli2.yaml 'docs/**/*.md' 2>&1)
exit_code=$?

if [[ $exit_code -eq 0 ]]; then
    echo "No markdown lint errors found."
    exit 0
fi

# Parse and group errors by rule name
python3 -c '
import sys
import re
from collections import defaultdict

RULE_DESCRIPTIONS = {
    "MD007": "Unordered list indentation — nested list items must use consistent indentation.",
    "MD010": "Hard tabs — use spaces instead of tab characters.",
    "MD012/no-multiple-blanks": "Multiple consecutive blank lines — use only one blank line between content blocks.",
    "MD040": "Fenced code blocks should have a language specified — add a language identifier after the opening ```.",
    "custom-anchor-headings": "Headings must have an explicit anchor ID — add {#my-id} at the end of each heading.",
}

# Pattern: file:line error RULE description [detail] [Context: "..."]
line_re = re.compile(r"^(.+?):(\d+)\s+error\s+(\S+)\s+(.*)$")

groups = defaultdict(list)
unparsed = []

for line in sys.stdin:
    line = line.rstrip("\n")
    if not line:
        continue
    m = line_re.match(line)
    if m:
        filepath, lineno, rule, rest = m.groups()
        groups[rule].append((filepath, lineno, rest))
    else:
        unparsed.append(line)

if not groups and not unparsed:
    sys.exit(0)

total = sum(len(v) for v in groups.values())
print(f"Found {total} markdown lint error(s) across {len(groups)} rule(s):\n")

for rule in sorted(groups.keys()):
    entries = groups[rule]
    desc = RULE_DESCRIPTIONS.get(rule, "")
    print(f"── {rule} ({len(entries)} error(s)) ──")
    if desc:
        print(f"   {desc}")
    print()

    # Group by file for compactness
    by_file = defaultdict(list)
    for filepath, lineno, rest in entries:
        by_file[filepath].append(lineno)

    for filepath in sorted(by_file.keys()):
        lines = by_file[filepath]
        if len(lines) <= 10:
            joined = ",".join(lines)
            print(f"  {filepath}:{joined}")
        else:
            print(f"  {filepath}: {len(lines)} occurrences (lines {lines[0]}..{lines[-1]})")
    print()

if unparsed:
    print("── Other output ──")
    for line in unparsed:
        print(f"  {line}")
    print()
' <<< "$raw_output"

exit $exit_code
