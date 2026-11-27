# Change Log

All notable changes to the "strudel-lsp-server" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Added a deterministic performance harness with 18 representative workloads, p50/p95/p99 baseline targets and an advisory regression check.
- Added bounded on-demand workspace symbols with open-document overrides.
- Added conservative `refactor.inline` code action for single-use literal constants.
- Upgraded prototype client `glob` to 14.0.6 and refreshed its lockfile to clear dependency advisories.
- Added GitHub Actions CI for verification, packaging, benchmark execution and dependency auditing.
- Initial release