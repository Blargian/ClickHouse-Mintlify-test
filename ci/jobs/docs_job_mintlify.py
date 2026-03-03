import argparse
import os

from ci.praktika.result import Result
from ci.praktika.utils import Shell, Utils


def parse_args():
    parser = argparse.ArgumentParser(description="Docs check (Mintlify)")
    parser.add_argument("--test", help="Sub check name", default="")
    parser.add_argument(
        "--param",
        help="Vale minimum alert level (suggestion, warning, error)",
        default="",
    )
    parser.add_argument(
        "--path",
        help="File glob or specific path for Vale",
        default="",
    )
    return parser.parse_args()


if __name__ == "__main__":

    results = []
    stop_watch = Utils.Stopwatch()
    temp_dir = f"{Utils.cwd()}/ci/tmp/"
    args = parse_args()
    testpattern = args.test

    testname = "broken-link-and-anchor-check"
    if testpattern.lower() in testname.lower():
        results.append(
            Result.from_commands_run(
                name=testname,
                command=[
                    "cd docs && mint broken-links --check-anchors",
                ]
            )
        )

    testname = "mint-validate"
    if testpattern.lower() in testname.lower():
        results.append(
            Result.from_commands_run(
                name=testname,
                command=[
                    "cd docs && mint validate",
                ]
            )
        )

    testname = "markdown-lint"
    if testpattern.lower() in testname.lower():
        results.append(
            Result.from_commands_run(
                name=testname,
                command=[
                    "bash ci/jobs/scripts/docs/check_markdown_lint.sh",
                ]
            )
        )

    testname = "vale"
    if testpattern.lower() in testname.lower():
        min_alert_level = args.param if args.param in ("suggestion", "warning", "error") else "error"
        vale_path = args.path if args.path else "."
        vale_cmd = f"cd docs && vale --config styles/.vale.ini --minAlertLevel={min_alert_level} --glob='*.{{md,mdx}}' {vale_path}"
        results.append(
            Result.from_commands_run(
                name=testname,
                command=[vale_cmd],
            )
        )

    testname = "aspell"
    if testpattern.lower() in testname.lower():
        aspell_path = args.path if args.path else ""
        aspell_cmd = f"bash ci/jobs/scripts/docs/check_aspell.sh {aspell_path}"
        results.append(
            Result.from_commands_run(
                name=testname,
                command=[aspell_cmd],
            )
        )

    Result.create_from(results=results).complete_job()
