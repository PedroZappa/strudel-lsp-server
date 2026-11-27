# Change Log

All notable changes to the "strudel-lsp-server" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Declared Node 24/26 and npm 11 support in package `engines` and documented the first-release OS validation matrix.
- Documented the `0.1.0` configuration boundary: no custom settings, with diagnostic overrides and Strudel version selection deferred.
- Set the initial public release identity to `0.1.0`, with `vX.Y.Z` tags and a pre-1.0 SemVer policy.
- Changed the project licence to AGPL-3.0-only to align with the pinned AGPL-only parser and the Strudel AGPL family, and extended package verification to check the installed licence.
- Replaced the stale prototype README with authoritative npm package documentation and added offline tarball/stdio verification via `npm run verify:package`.
- Added a deterministic performance harness with 18 representative workloads, p50/p95/p99 baseline targets and an advisory regression check.
- Added bounded on-demand workspace symbols with open-document overrides.
- Added conservative `refactor.inline` code action for single-use literal constants.
- Upgraded prototype client `glob` to 14.0.6 and refreshed its lockfile to clear dependency advisories.
- Added GitHub Actions CI for verification, packaging, benchmark execution and dependency auditing.
- Initial release