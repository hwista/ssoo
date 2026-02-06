# Changelog

## [Unreleased]

### Bug Fixes

* **database:** DBML 문서 출력 경로 수정 - 워크스페이스 외부가 아닌 `docs/` 하위로 정상 출력 ([export-dbml.js](packages/database/scripts/export-dbml.js), [render-dbml.js](packages/database/scripts/render-dbml.js))

---

## 0.0.1 (2026-01-25)


### Bug Fixes

* 사이드바 스크롤 영역을 검색란 아래로 한정 ([ebd82f5](https://github.com/hwista/sooo/commit/ebd82f5ab7be9f5563ca6638721a9d8fe23a0ab9))
* 접힌 사이드바에서 관리자 메뉴 표시 ([6d0a8b9](https://github.com/hwista/sooo/commit/6d0a8b931250e3a0bb14a75af562cbcec87908d9))
* 즐겨찾기 API 404 에러 수정 ([405d713](https://github.com/hwista/sooo/commit/405d713e7a1deda1b2fc35b756b8f023c25960c6))
* 현재 열린 페이지에서 홈 탭 제외 ([bba91bc](https://github.com/hwista/sooo/commit/bba91bc04376df1d027b6aa3354f01e38bff7da8))
* add ls-red-hover for destructive button hover state ([961aba8](https://github.com/hwista/sooo/commit/961aba8049cb80a14c00b1591abafc50f8e2a0bb))
* apply ls-red-hover class to destructive button ([c1a97b1](https://github.com/hwista/sooo/commit/c1a97b189c9c9a1eedaaf937e0767ac7dcf1504d)), closes [#d90027](https://github.com/hwista/sooo/issues/d90027)
* **docs:** 백로그 중복 제거 - docs/BACKLOG.md로 통합 ([6dc1766](https://github.com/hwista/sooo/commit/6dc17667ab092db0acdc65d90ff92b92fcb95bcb))
* **menu:** add pms schema prefix to raw SQL queries ([d96b73d](https://github.com/hwista/sooo/commit/d96b73d8785c1f677cb4f698ad87474621ef28ff))
* **ui:** center loading state vertically on page ([56191f8](https://github.com/hwista/sooo/commit/56191f82efd334ba2dc9ec08e50bbebafe795715))
* **ui:** center page loading spinner in ContentArea ([a5b5694](https://github.com/hwista/sooo/commit/a5b5694eb3ffaab07ee97925f4cf27fa809b74fb))


### Code Refactoring

* **types:** sync type definitions with Prisma schema ([0ca75ec](https://github.com/hwista/sooo/commit/0ca75ecd2293901a9e3ff5c1d7432779322e7037))


### Features

* 사이드바 하단에 카피라이트 영역 추가 ([188c1f7](https://github.com/hwista/sooo/commit/188c1f7befffa40fe69d5530b592d3eb8dffb29f))
* 즐겨찾기 DB 연동 구현 ([8047c9c](https://github.com/hwista/sooo/commit/8047c9c9cef4783c8c863752b6736738aa9d5916))
* 초기 프로젝트 구성 완료 ([15f26f8](https://github.com/hwista/sooo/commit/15f26f83a001d80bbe82affe6827b9c42524e33f))
* 커스텀 스크롤바 디자인 시스템 추가 ([d43cb90](https://github.com/hwista/sooo/commit/d43cb90ba74026821749d405900dfcb259bdec81))
* add Home tab with dashboard placeholder and improve tab styling ([0b7b3bf](https://github.com/hwista/sooo/commit/0b7b3bf1164167eaa5229b6f783a0807eb7f8087)), closes [#9FC1E7](https://github.com/hwista/sooo/issues/9FC1E7) [#003876](https://github.com/hwista/sooo/issues/003876) [#7D8282](https://github.com/hwista/sooo/issues/7D8282)
* add quality gate and security improvements (IMMEDIATE tasks) ([3d811f3](https://github.com/hwista/sooo/commit/3d811f3b76fdd50664bc3a693738f7630c58e431))
* **docs:** add conventional-changelog for hybrid changelog management ([55d4085](https://github.com/hwista/sooo/commit/55d40858f482b9a55756529c6cd15fac3cf3142e))
* **docs:** add Redoc HTML generation for OpenAPI specs ([50e84d0](https://github.com/hwista/sooo/commit/50e84d0d7945e6ae4139ba767f6c47f79fb36d83))
* implement role-based access control (P1-FEATURE) ([a4fe62b](https://github.com/hwista/sooo/commit/a4fe62b1c7c2d046cc7029b3cdb09276cacdd5e7))
* **server:** add JwtAuthGuard to ProjectController ([79b3e6b](https://github.com/hwista/sooo/commit/79b3e6b30ee28b875a80b30dc31ffa6493dd706c))
* **server:** add rate limiting and strengthen password policy ([ca76541](https://github.com/hwista/sooo/commit/ca7654194ee6961e82ffe6fce0e50fe6e427bd36))


### BREAKING CHANGES

* **types:** Type literal values changed to match database schema



