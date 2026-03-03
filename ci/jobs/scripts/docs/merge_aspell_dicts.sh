#!/usr/bin/env bash
#
# Merge multiple aspell dictionary files into one.
# Accepts aspell personal dictionaries (header: personal_ws-1.1 LANG COUNT)
# and the clickhouse-docs per-file dictionary (aspell-dict-file.txt with --path-- markers).
# Outputs a merged, sorted, deduplicated dictionary to stdout.
#
# Usage:
#   ./merge_aspell_dicts.sh dict1.txt dict2.txt [aspell-dict-file.txt ...] > merged.txt

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <dict1> [dict2] [dict3] ... > output.txt" >&2
    exit 1
fi

collect_words() {
    for file in "$@"; do
        if [[ ! -f "$file" ]]; then
            echo "Warning: file '$file' not found, skipping" >&2
            continue
        fi

        while IFS= read -r line; do
            # Skip blank lines
            [[ -z "$line" ]] && continue
            # Skip aspell header lines
            [[ "$line" =~ ^personal_ws-1\.1 ]] && continue
            # Skip per-file dictionary path markers (--filepath--)
            [[ "$line" =~ ^--.*--$ ]] && continue
            echo "$line"
        done < "$file"
    done
}

words=$(collect_words "$@" | sort -u)
count=$(echo "$words" | grep -c . || echo 0)

echo "personal_ws-1.1 en ${count} "
echo "$words"
