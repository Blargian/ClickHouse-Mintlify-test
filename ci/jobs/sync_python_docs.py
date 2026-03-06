"""
Nightly job to sync Python client documentation from clickhouse-connect.

Clones the docs from https://github.com/ClickHouse/clickhouse-connect,
syncs them into docs/docs/language-clients/python/, updates navigation
in docs/docs.json, and creates/updates a PR if there are changes.
"""

import json
import subprocess
import sys
from pathlib import Path

from ci.praktika.utils import Shell


def main():
    source_repo = "https://github.com/ClickHouse/clickhouse-connect.git"
    clone_dir = Path("ci/tmp/clickhouse-connect")
    source_dir = clone_dir / "docs"
    dest_dir = Path("docs/docs/language-clients/python")
    core_docs_json = Path("docs/docs.json")
    branch_name = "docs/sync-python-client"

    # Clean up any previous clone
    Shell.check(f"rm -rf {clone_dir}")
    clone_dir.mkdir(parents=True, exist_ok=True)

    # Sparse-checkout only the docs directory
    print("Cloning clickhouse-connect docs...")
    Shell.check(
        f"git clone --depth 1 --filter=blob:none --sparse {source_repo} {clone_dir}"
    )
    Shell.check(f"git -C {clone_dir} sparse-checkout set docs")

    if not source_dir.exists():
        print("ERROR: docs directory not found in clickhouse-connect")
        sys.exit(1)

    # Sync doc files
    print("Syncing doc files...")
    dest_dir.mkdir(parents=True, exist_ok=True)
    Shell.check(
        f"rsync -av --delete "
        f"--exclude='docs.json' "
        f"--exclude='snippets/' "
        f"--exclude='images/' "
        f"--exclude='favicon.svg' "
        f"{source_dir}/ {dest_dir}/"
    )

    # Update navigation in docs.json
    print("Updating navigation in docs.json...")
    update_navigation(source_dir / "docs.json", core_docs_json)

    # Check for changes
    result = subprocess.run(
        ["git", "diff", "--quiet"], capture_output=True, text=True
    )
    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard", str(dest_dir)],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0 and not untracked.stdout.strip():
        print("No changes detected, nothing to do.")
        return

    # Create branch and commit
    print("Creating branch and committing changes...")
    # Check if the branch already exists on remote
    branch_exists = subprocess.run(
        ["git", "ls-remote", "--heads", "origin", branch_name],
        capture_output=True,
        text=True,
    )
    if branch_exists.stdout.strip():
        Shell.check(f"git fetch origin {branch_name}")
        Shell.check(f"git checkout {branch_name}")
        Shell.check("git merge origin/master --no-edit")
    else:
        Shell.check(f"git checkout -b {branch_name}")

    Shell.check("git add -A")
    Shell.check(
        'git commit -m "docs: sync Python client docs from clickhouse-connect"'
    )
    Shell.check(f"git push origin {branch_name} --force-with-lease")

    # Create or update PR
    print("Creating/updating PR...")
    pr_exists = subprocess.run(
        ["gh", "pr", "view", branch_name, "--json", "number"],
        capture_output=True,
        text=True,
    )
    if pr_exists.returncode != 0:
        Shell.check(
            "gh pr create "
            f"--head {branch_name} "
            "--base master "
            '--title "docs: sync Python client docs from clickhouse-connect" '
            '--body "Automated sync of Python client documentation from '
            "[clickhouse-connect](https://github.com/ClickHouse/clickhouse-connect/tree/main/docs).\\n\\n"
            'This PR was created automatically by the `NightlySyncPythonDocs` workflow."'
        )
        print("PR created.")
    else:
        print("PR already exists, pushed updated changes.")


def update_navigation(source_docs_json: Path, core_docs_json: Path):
    """Extract Python nav group from clickhouse-connect and merge into core docs.json."""
    with open(source_docs_json) as f:
        cc_config = json.load(f)

    # Find the Python group in clickhouse-connect config
    cc_tabs = cc_config["navigation"]["languages"][0]["tabs"]
    python_group = None
    for tab in cc_tabs:
        for item in tab.get("menu", []):
            if item.get("group") == "Python":
                python_group = item
                break
        if python_group:
            break

    if not python_group:
        print("ERROR: Could not find Python group in clickhouse-connect docs.json")
        sys.exit(1)

    # Remap page paths
    def remap_pages(pages):
        remapped = []
        for page in pages:
            if isinstance(page, str):
                remapped.append(f"docs/language-clients/python/{page}")
            elif isinstance(page, dict) and "pages" in page:
                remapped.append({**page, "pages": remap_pages(page["pages"])})
            else:
                remapped.append(page)
        return remapped

    python_group_remapped = {**python_group, "pages": remap_pages(python_group["pages"])}

    # Read and update core docs.json
    with open(core_docs_json) as f:
        core_config = json.load(f)

    replaced = False
    for lang in core_config["navigation"]["languages"]:
        for tab in lang.get("tabs", []):
            for item in tab.get("menu", []):
                if not isinstance(item, dict) or "pages" not in item:
                    continue
                for j, subitem in enumerate(item["pages"]):
                    if (
                        isinstance(subitem, dict)
                        and subitem.get("group") == "Python"
                        and "language-clients/python" in json.dumps(subitem)
                    ):
                        item["pages"][j] = python_group_remapped
                        replaced = True
                        break
                if replaced:
                    break
            if replaced:
                break
        if replaced:
            break

    if not replaced:
        print("WARNING: Could not find existing Python group in core docs.json")
        print("Navigation was not updated")
        sys.exit(1)

    with open(core_docs_json, "w") as f:
        json.dump(core_config, f, indent=2)
        f.write("\n")

    print("Successfully updated Python navigation in core docs.json")


if __name__ == "__main__":
    main()
