#!/usr/bin/env bash
#
# Spell-check documentation using aspell.
# Runs from the repository root.
#
# Usage:
#   ci/jobs/scripts/docs/check_aspell.sh              # check all docs
#   ci/jobs/scripts/docs/check_aspell.sh <filepath>   # check a single file

set -euo pipefail

ROOT_PATH="."
CHECK_LANG=en
ASPELL_IGNORE_PATH="${ROOT_PATH}/ci/jobs/scripts/docs/aspell-ignore/${CHECK_LANG}"

# ---------------------------------------------------------------------------
# Validate dictionary header
# ---------------------------------------------------------------------------
check_aspell_dict_header() {
    local dict_file="$1"
    local expected_lang="$2"

    if [[ ! -f "$dict_file" ]]; then
        echo "Error: Dictionary file '$dict_file' does not exist"
        return 1
    fi

    local first_line
    first_line=$(head -n 1 "$dict_file" | sed 's/[[:space:]]*$//')

    if [[ ! "$first_line" =~ ^personal_ws-1\.1[[:space:]]+${expected_lang}[[:space:]]+[0-9]+$ ]]; then
        echo "Error: Dictionary file '$dict_file' missing or invalid header"
        echo "Expected format: personal_ws-1.1 ${expected_lang} <word_count>"
        echo "Found: $first_line"
        return 1
    fi

    return 0
}

# ---------------------------------------------------------------------------
# Preprocessing — strip content that confuses aspell
# ---------------------------------------------------------------------------
preprocess_file() {
    local file=$1

    # 1. Remove YAML frontmatter (between first --- and second ---)
    # 2. Remove {#anchor} slugs
    # 3. Remove <*svg> JSX components
    # 4. Remove <Image> JSX tags
    # 5. Filter out import/slug/details/summary lines
    awk '
    BEGIN { in_frontmatter = 0 }
    /^---$/ && NR == 1 { in_frontmatter = 1; next }
    /^---$/ && in_frontmatter { in_frontmatter = 0; next }
    !in_frontmatter { print }
    ' "$file" \
        | sed -E 's/\{#[^}]*\}//g' \
        | sed -E 's/<[A-Za-z0-9_]+svg[^>]*\/?>//g' \
        | sed -E 's/<Image[^>]*\/?>//g' \
        | grep -Ev '(^[[:space:]]*(slug:)|^import .* from .*)' \
        | grep -Ev '(^<details>|^<summary>)'
}

# ---------------------------------------------------------------------------
# Ignore list (glob patterns relative to ROOT_PATH)
# ---------------------------------------------------------------------------
IGNORE_LIST=(
    "${ROOT_PATH}/docs/docs/releases/*"
)

is_ignored() {
    local file=$1
    for ignored_pattern in "${IGNORE_LIST[@]}"; do
        # shellcheck disable=SC2053
        if [[ "$file" == $ignored_pattern ]]; then
            return 0
        fi
    done
    return 1
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

echo "Checking spelling using aspell"

if ! command -v aspell &> /dev/null; then
    echo "Error: aspell is not installed."
    exit 1
fi

if ! check_aspell_dict_header "${ASPELL_IGNORE_PATH}/aspell-dict.txt" "$CHECK_LANG"; then
    echo "Please ensure aspell-dict.txt has the proper header format"
    exit 1
fi

# Determine files to check
if [[ -n "${1:-}" ]]; then
    FILES_TO_CHECK="$1"
else
    FILES_TO_CHECK=$(find docs/docs -type f \( -name "*.md" -o -name "*.mdx" \))
fi

STATUS=0
for fname in $FILES_TO_CHECK; do
    if is_ignored "$fname"; then
        continue
    fi

    errors=$(preprocess_file "$fname" \
        | aspell list \
            -W 3 \
            --personal=aspell-dict.txt \
            --add-sgml-skip=code \
            --encoding=utf-8 \
            --mode=markdown \
            --lang=${CHECK_LANG} \
            --home-dir=${ASPELL_IGNORE_PATH} \
        | sort | uniq)

    if [[ -n "$errors" ]]; then
        STATUS=1
        echo "====== $fname ======"
        echo "$errors"
    fi
done

if (( STATUS != 0 )); then
    echo "====== Errors found ======"
    echo "To exclude words, add them to \"${ASPELL_IGNORE_PATH}/aspell-dict.txt\""
fi

exit ${STATUS}
