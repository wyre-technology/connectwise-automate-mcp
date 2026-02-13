# 1.0.0 (2026-02-13)


### Bug Fixes

* **ci:** Add GitHub Packages auth to test job for scoped dependency ([24f6717](https://github.com/wyre-technology/connectwise-automate-mcp/commit/24f671752b30411d2998916e25185f1c459fb2eb))
* **ci:** Fix workflow scope and regenerate lock file ([e534672](https://github.com/wyre-technology/connectwise-automate-mcp/commit/e5346724761eba88af14ff24b381d176564a26c8))


### Features

* add deploy infrastructure (docker-compose, DO, Cloudflare) and badges ([5a4c94e](https://github.com/wyre-technology/connectwise-automate-mcp/commit/5a4c94eaf6022c4d604b3eca7fa872ac0e534076))
* Initial ConnectWise Automate MCP server with decision tree architecture ([3202229](https://github.com/wyre-technology/connectwise-automate-mcp/commit/320222947f78f2d79b8a0d6ddc8576a5d204c242))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of ConnectWise Automate MCP server
- Decision tree architecture with domain navigation
- Computers domain with list, get, search, reboot, and run script tools
- Clients domain with list, get, create, and update tools
- Alerts domain with list, get, and acknowledge tools
- Scripts domain with list, get, and execute tools
- Lazy loading for client initialization and domain handlers
- Comprehensive Vitest test suite
- Docker support

[Unreleased]: https://github.com/wyre-technology/connectwise-automate-mcp/compare/HEAD
