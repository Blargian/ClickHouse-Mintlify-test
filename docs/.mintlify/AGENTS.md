# ClickHouse documentation style guide

When writing or editing documentation, follow the prose style rules defined in the Vale linting configuration.

- Vale config: `docs/styles/.vale.ini`
- Style rules: `docs/styles/vale/ClickHouse/*.yml`

Each `.yml` file defines a rule with a `message` field explaining what to do. Follow all of these rules when generating or modifying documentation.

Also follow the markdown lint rules defined in `docs/styles/.markdownlint-cli2.yaml`.

Spelling is checked by aspell using a custom dictionary at `ci/jobs/scripts/docs/aspell-ignore/en/aspell-dict.txt`. If you introduce a new technical term that is not a common English word (e.g. a ClickHouse function name, a product name, or an acronym), add it to this dictionary file in alphabetical order and update the word count in the header line.
