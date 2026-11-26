# 관리자 주간 현황 첫 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 페이지를 주간 현황 중심으로 바꾸고(클릭 관리·부서 색·🔁), 예약 목록의 고정예약을 한 줄로 묶는다.

**Architecture:** admin.html / admin.js / admin.css만 수정. 데이터·DB 변경 없음. 묶음은 `recurring_group_id` 기준으로 화면에서만 만든다.

**Tech Stack:** 바닐라 JS, GitHub Pages(main 브랜치) 배포.

**Spec:** docs/superpowers/specs/2026-11-26-admin-weekly-first-design.md

## Global Constraints
- 부서 색 규칙: '신학'·'산학' 포함 → 보라, '청년' 포함 → 초록, 그 외 → 회색. `DEPT_COLORS` 한 곳에 모은다.
- 사용자 입력은 화면에 넣기 전 `esc()`.
- 자산 버전 쿼리(`?v=`)를 올려 캐시된 옛 파일이 섞이지 않게.

## Review Focus
- 단일 예약을 주간 표에서 열었을 때 삭제 버튼이 있어야 한다 (기존 상세 창엔 고정예약용 삭제만 있었다).
- 필터에 맞는 날짜가 묶음 일부뿐이어도 묶음 1줄이 나온다; 날짜 필터 시 그 날짜의 상세가 열린다.
- `recurring_group_id`가 비어 있는 고정예약은 개별 줄로 남는다.
- 수정·삭제 후 주간 표와 목록이 즉시 다시 그려진다.
- 부서 값이 비어 있으면 회색.

---

### Task 1: 첫 화면·메뉴 순서 + 주간 표 클릭/색/🔁
- admin.html: 주간 메뉴를 맨 위, `active`; `view-weekly`를 기본 활성 섹션으로. 기존 '예약 관리' 메뉴 이름은 '예약 목록'.
- admin.js: `deptColorKey(department: string): "theology"|"youth"|"other"`, `DEPT_COLORS` 범례 렌더; 카드에 `data-id`, 클릭 → `renderDetailView`.
- 상세 창: 단일 예약용 `modalDeleteBtn`.
- init 마지막에 `renderWeeklyAdminView()`.

### Task 2: 예약 목록 고정예약 묶기
- `groupForList(rows): Array<{type:"single", r} | {type:"series", rows, first, last, pick}>`; `renderTable`/`renderPagination`은 묶은 항목 기준.
- 묶음 줄: 날짜 `YYYY.MM.DD (요일) ~ YYYY.MM.DD (요일)`, 유형 `매주 목 · 총 N회`.
- 클릭 대상 `pick`: 날짜 필터가 있으면 그 날짜 행, 없으면 다음 예정일, 없으면 마지막 날짜.

### Task 3: 브라우저 확인 후 배포
- 가짜 데이터로 headless Chrome 확인 → Develop 커밋 → PR → main 병합 → Pages 반영 확인.
