# [1.2.0](https://github.com/wyre-technology/connectwise-automate-mcp/compare/v1.1.0...v1.2.0) (2026-02-18)


### Bug Fixes

* **ci:** fix release workflow failures ([3107f4c](https://github.com/wyre-technology/connectwise-automate-mcp/commit/3107f4c4ed7abb3e32bb6cbb55836ce390b40e35))
* **docker:** drop arm64 platform to fix QEMU build failures ([29951e6](https://github.com/wyre-technology/connectwise-automate-mcp/commit/29951e6cec869b9ef93695f1639cc5806ac74a18))
* use npm install instead of npm ci for lock file compatibility ([2c0134a](https://github.com/wyre-technology/connectwise-automate-mcp/commit/2c0134abd794e71313cec9203f4f89f67dd99648))


### Features

* add MCPB bundle to release workflow ([bdab179](https://github.com/wyre-technology/connectwise-automate-mcp/commit/bdab1791ea198b523db877773026bd89665b9b20))
* add MCPB manifest for desktop installation ([7661d6c](https://github.com/wyre-technology/connectwise-automate-mcp/commit/7661d6ccf31fc5347bdf0eab833d993801b361ac))
* add MCPB pack script ([396e797](https://github.com/wyre-technology/connectwise-automate-mcp/commit/396e7978cb78ae15aa8851f8bb7d63e85952cf6d))

# [1.1.0](https://github.com/wyre-technology/connectwise-automate-mcp/compare/v1.0.0...v1.1.0) (2026-02-17)


### Bug Fixes

* **ci:** fix release workflow with npm auth, Node 22, and Docker build ([3b81a43](https://github.com/wyre-technology/connectwise-automate-mcp/commit/3b81a4338608a687491d5de2e6d625009549d1b3))
* **ci:** remove old [@asachs01](https://github.com/asachs01) scope from .npmrc ([7fa6cb7](https://github.com/wyre-technology/connectwise-automate-mcp/commit/7fa6cb72a484a068804b37e5c5fce938dc64acd8))
* **ci:** replace Dockerfile with proper multi-stage build ([e73dbb6](https://github.com/wyre-technology/connectwise-automate-mcp/commit/e73dbb686e0a1922a5c1142ce6b8ff17d57bb858))
* **ci:** revert ci.yml release job scope to [@asachs01](https://github.com/asachs01) ([e86c99e](https://github.com/wyre-technology/connectwise-automate-mcp/commit/e86c99e793c4cfe74d14d45632c798a967f7d9a7))
* **ci:** revert release.yml npm config to [@asachs01](https://github.com/asachs01) scope ([5c879ed](https://github.com/wyre-technology/connectwise-automate-mcp/commit/5c879ed123f9b18273c6c1fc583535aa4e44c9fb))
* **ci:** update dependency scope from [@asachs01](https://github.com/asachs01) to [@wyre-technology](https://github.com/wyre-technology) ([c9e78bc](https://github.com/wyre-technology/connectwise-automate-mcp/commit/c9e78bce9ecfc6fb08737d27e6ac6f15e9caad9f))
* **docker:** use [@asachs01](https://github.com/asachs01) scope in .npmrc during build ([80e92aa](https://github.com/wyre-technology/connectwise-automate-mcp/commit/80e92aac2343ed0d72e515586ba9462c9dffea7a))
* escape newlines in .releaserc.json message template ([bd71ee4](https://github.com/wyre-technology/connectwise-automate-mcp/commit/bd71ee4dc67a82fd4dc93ccf9c29e7bf345c40da))
* revert .npmrc to [@asachs01](https://github.com/asachs01) scope for GitHub Packages registry ([4ee14cf](https://github.com/wyre-technology/connectwise-automate-mcp/commit/4ee14cfb76cafd9b10d545f4f097c86830765de6))
* revert peerDependencies to [@asachs01](https://github.com/asachs01) scope (package not published under [@wyre-technology](https://github.com/wyre-technology)) ([9292efc](https://github.com/wyre-technology/connectwise-automate-mcp/commit/9292efc6d9726f93d34bbbd196e592f098db54ee))


### Features

* add mcpb packaging support ([891251c](https://github.com/wyre-technology/connectwise-automate-mcp/commit/891251c7b38dccb1833fbea0d8c3bd20903d8f85))
* add mcpb packaging support ([0f019fd](https://github.com/wyre-technology/connectwise-automate-mcp/commit/0f019fdb88260aff2361886e0a4939e0ea9ed86d))
* add mcpb packaging support ([b47adfb](https://github.com/wyre-technology/connectwise-automate-mcp/commit/b47adfbef4ad41b24267ccb4a5faf4938f6fb5d4))
* add mcpb packaging support ([b572546](https://github.com/wyre-technology/connectwise-automate-mcp/commit/b572546b9d7496ee1eaf52c6738939303bb320e3))
* add mcpb packaging support ([2f3057b](https://github.com/wyre-technology/connectwise-automate-mcp/commit/2f3057b60183dbafcd0fb02334636b044e762afe))

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
