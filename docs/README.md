<div align=center>

[![Website](https://img.shields.io/website?up_message=AVAILABLE&down_message=DOWN&url=https%3A%2F%2Fclickhouse.com%2Fdocs&style=for-the-badge)](https://clickhouse.com)
[![CC BY-NC-SA 4.0 License](https://img.shields.io/badge/license-CC-blueviolet?style=for-the-badge)](http://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Checks](https://img.shields.io/github/actions/workflow/status/clickhouse/clickhouse-docs/debug.yml?style=for-the-badge&label=Checks)](https://github.com/ClickHouse/clickhouse-docs/actions)

<picture align=center>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ClickHouse/clickhouse-docs/assets/9611008/4ef9c104-2d3f-4646-b186-507358d2fe28">
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/ClickHouse/clickhouse-docs/assets/9611008/b001dc7b-5a45-4dcd-9275-e03beb7f9177">
    <img alt="The ClickHouse company logo." src="https://github.com/ClickHouse/clickhouse-docs/assets/9611008/b001dc7b-5a45-4dcd-9275-e03beb7f9177">
</picture>

<h4>ClickHouse® is an open-source column-oriented database management system that allows generating analytical data reports in real-time.</h4>

</div>

---

ClickHouse is blazing fast, but understanding ClickHouse and using it effectively is a journey. The documentation is your source for gaining the knowledge you need to be successful with your ClickHouse projects and applications. [Head over to clickhouse.com/docs to learn more →](https://clickhouse.com/)

## Table of contents

- [About this repo](#about-this-repo)
- [Run locally](#run-locally)
- [Contributing](#contributing)
- [Search](#search)
- [Issues](#issues)
- [License](#license)

## About this repo

This folder contains the official ClickHouse documentation which is built with [Mintlify](https://www.mintlify.com/) and hosted at [www.clickhouse.com/docs](https://clickhouse.com/docs).

## Build the docs locally

To build and preview the documentation locally, all you need is the [Mintlify CLI](https://www.mintlify.com/docs/installation#install-the-cli) utility installed globally on your machine.

Install it by running:

```bash
npm i -g mint
# pnpm add -g mint
```

Once installed, run the following command from the `/docs` directory of the ClickHouse repository:

```bash
mint dev
```

You should see the documentation site open on `localhost:3000` in your browser.

## To run CI checks locally

Prerequisites:
- You have docker desktop installed
- You have python3 installed

Build the docs CI docker image `docs-builder`:

```bash
docker build -t clickhouse/docs-builder /path-to-clickhouse-repo/ci/docker/docs-builder/
```

It's only necessary to build the docker image as a temporary measure.
When fully migrated to Mintlify the image will be hosted on docker hub.

Run all CI checks locally:

```bash
python3 -m ci.praktika run "Docs check (Mintlify)" --docker clickhouse/docs-builder
```

To run only a specific check, you can run:

```bash
python3 -m ci.praktika run "Docs check (Mintlify)" --docker clickhouse/docs-builder --test="testname"
```

Replacing `testname` above with one of the following test names:

| Test name | Test description                                                                                                                                                                                                                                                                          |
|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `broken-link-and-anchor-check` | Runs `mint broken-links --check-anchors` to detect broken internal links and anchors across the documentation                                                                                                                                                                             |
| `mint-validate` | Runs `mint validate` to verify that the documentation builds successfully                                                                                                                                                                                                                 |
| `markdown-lint` | Runs `markdownlint-cli2` to check markdown style (indentation, tabs, blank lines, code block languages, heading anchors)                                                                                                                                                                  |
| `vale` | Runs Vale prose linting (default: errors only). Vale is a tool for checking writing style, helping humans and agents to produce consistent, easy-to-read documentation. When running locally use the additional flags described below to target specific files or change the error level. |
| `aspell` | Runs aspell spell checking on all markdown files in `docs/docs/`. Uses a custom dictionary at `ci/jobs/scripts/docs/aspell-ignore/en/aspell-dict.txt`. Supports `--path` to check a single file. |

Additional flags for Vale (uses praktika's built-in `--param` and `--path` flags):

- `--param <level>`: Set minimum Vale alert level (`suggestion`, `warning`, or `error`). Default: `error`
- `--path <path>`: File or directory path for Vale to check. Default: `.` (all docs)

Vale examples:

```bash
# Run Vale at error level (default — currently passes since no rules use error severity)
python3 -m ci.praktika run "Docs check (Mintlify)" --docker clickhouse/docs-builder --test="vale"

# Run Vale at warning level to see all warnings
python3 -m ci.praktika run "Docs check (Mintlify)" --docker clickhouse/docs-builder --test="vale" --param warning

# Run Vale on a specific directory (relative to /docs folder of repository)
python3 -m ci.praktika run "Docs check (Mintlify)" --docker clickhouse/docs-builder --test="vale" --path docs/cloud/

# Run Vale on a specific file (relative to /docs folder of repository)
python3 -m ci.praktika run "Docs check (Mintlify)" --docker clickhouse/docs-builder --test="vale" --path docs/get-started/quick-start.md
```

## Contributing

Want to help out? Contributions are always welcome! If you want to help out but aren't sure where to start, check out the [issues board](https://github.com/clickhouse/clickhouse-docs/issues).

### Pull requests

Please assign any pull request (PR) against an issue; this helps the docs team track who is working on what and what each PR is meant to address. If there isn't an issue for the specific _thing_ you want to work on, quickly create one and comment so that it can be assigned to you. One of the repository maintainers will add you as an assignee.

Check out the GitHub docs for a refresher on [how to create a pull request](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/creating-an-issue-or-pull-request-from-github-desktop).

### Style and contribution guidelines

For documentation style guidelines, see ["Style guide"](/contribute/style-guide.md).

To check spelling and markdown is correct locally run:

```bash
yarn check-style
```

### Generating documentation from source code

For an overview of how reference documentation such as settings, system tables
and functions are generated from the source code, see ["Generating documentation from source code"](/contribute/autogenerated-documentation-from-source.md)

### Tests and CI/CD

There are five workflows that run against PRs in this repo:

| Name | Description |
| ---- | ----------- |
| [Debug](https://github.com/ClickHouse/clickhouse-docs/blob/main/.github/workflows/debug.yml) | A debugging tool that prints environment variables and the content of the `GITHUB_EVENT_PATH` variable for each commit. |
| [Link check](https://github.com/ClickHouse/clickhouse-docs/blob/main/.github/workflows/linkcheck.yml) | Checks for broken external links in this repo. |
| [Pull request](https://github.com/ClickHouse/clickhouse-docs/blob/main/.github/workflows/pull-request.yml) | This is a _meta_ workflow that sets up a testing environment and calls the `docs_check.py` and `finish_check.py` scripts. |
| [Scheduled Vercel build](https://github.com/ClickHouse/clickhouse-docs/blob/main/.github/workflows/scheduled-vercel-build.yml) | Builds the site every day at 00:10 UTC and hosts the build on Vercel. |
| [Trigger build](https://github.com/ClickHouse/clickhouse-docs/blob/main/.github/workflows/trigger-build.yml) | Uses the [peter-evans/repository-dispatch@v2](https://github.com/peter-evans/repository-dispatch) workflow to create a repository dispatch. |

### Quick contributions

Have you noticed a typo or found some wonky formatting? For small contributions like these, it's usually faster and easier to make your changes directly in GitHub. Here's a quick guide to show you how the GitHub editor works:

1. Each page in Clickhouse.com/docs has an **Edit this page** link at the top:

   ![The ClickHouse Docs website with the edit button highlighted.](./static/images/contributing/readme-edit-this-page.png)

   Click this button to edit this page in GitHub.

1. Once you're in GitHub, click the pencil icon to edit this page:

   ![README Pencil Icon](./static/images/contributing/readme-pencil-icon.png)

1. GitHub will _fork_ the repository for you. This creates a copy of the `clickhouse-docs` repository on your personal GitHub account.
1. Make your changes in the textbox. Once you're done, click **Commit changes**:

   ![README Commit Changes](./static/images/contributing/readme-commit-changes.png)

1. In the **Propose changes** popup, enter a descriptive title to explain the changes you just made. Keep this title to 10 words or less. If your changes are fairly complex and need further explanation, enter your comments into the **Extended description** field.
1. Make sure **Create a new branch** is selected, and click **Propose changes**:

   ![README Propose Changes](./static/images/contributing/readme-propose-changes.png)

1. A new page should open with a new pull request. Double-check that the title and description are accurate.
1. If you've spoken to someone on the docs team about your changes, tag them into the **Reviewers** section:

   ![README Create Pull Request](./static/images/contributing/readme-create-pull-request.png)

   If you haven't mentioned your changes to anyone yet, leave the **Reviewers** section blank.

1. Click **Create pull request**.

At this point, your pull request will be handed over to the docs team, who will review it and suggest or make changes where necessary.

## Search

This site uses Algolia for search functionality. The search index is automatically updated daily at 4 AM UTC and immediately when PRs with the `update search` label are merged. For details on how search indexing works, manual indexing, and troubleshooting, see the [Search README](./scripts/search/README.md).

## Issues

Found a problem with the Clickhouse docs site? [Please raise an issue](https://github.com/clickhouse/clickhouse-docs/issues/new). Be as specific and descriptive as possible; screenshots help!

## License

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

## Resources

- [ClickHouse Agent Skills](https://github.com/ClickHouse/agent-skills)