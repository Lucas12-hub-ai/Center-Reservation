// ==========================================
// Supabase 연결 (예약 페이지와 동일한 프로젝트)
// ==========================================

const SUPABASE_URL = "https://ohnxhlbwzakwzhzhkhvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v8DnBpF4GX4oABnGOfpRxA_QH6ruB5Q";

// 관리자 전용 서버 함수 (관리자 코드 확인 후 DB 조회·수정·삭제)
const ADMIN_API_URL = `${SUPABASE_URL}/functions/v1/admin-api`;

const ADMIN_CODE_STORAGE_KEY = "centerAdminCode";

// ==========================================
// 화면 가운데 안내창 / 확인창 (브라우저 기본 alert·confirm 대신)
// ==========================================

function openCenterDialog(message, buttons) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "center-dialog-overlay";
    overlay.innerHTML = `
      <div class="center-dialog" role="dialog" aria-modal="true">
        <p class="center-dialog-message"></p>
        <div class="center-dialog-actions"></div>
      </div>`;

    overlay.querySelector(".center-dialog-message").textContent = String(message);

    const actions = overlay.querySelector(".center-dialog-actions");
    actions.classList.toggle("single", buttons.length === 1);

    const finish = value => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(value);
    };

    const onKey = event => {
      if (event.key === "Escape") finish(buttons.length === 1);
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
    };

    buttons.forEach(({ text, value, primary }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = text;
      btn.className = primary ? "center-dialog-ok" : "center-dialog-cancel";
      btn.addEventListener("click", () => finish(value));
      actions.appendChild(btn);
    });

    overlay.addEventListener("click", event => {
      if (event.target === overlay) finish(buttons.length === 1);
    });

    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    actions.querySelector(".center-dialog-ok").focus();
  });
}

function showAlert(message) {
  return openCenterDialog(message, [{ text: "확인", value: true, primary: true }]);
}

function showConfirm(message, okText = "확인", cancelText = "취소") {
  return openCenterDialog(message, [
    { text: cancelText, value: false },
    { text: okText, value: true, primary: true }
  ]);
}

// 관리자 코드 입력창 (화면 가운데)
function promptAdminCode(errorMessage = "") {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "center-dialog-overlay";
    overlay.innerHTML = `
      <form class="center-dialog" role="dialog" aria-modal="true" autocomplete="off">
        <p class="center-dialog-message">관리자 코드를 입력해주세요.</p>
        <p class="center-dialog-error"></p>
        <input type="password" class="center-dialog-input" placeholder="관리자 코드" aria-label="관리자 코드">
        <div class="center-dialog-actions">
          <button type="button" class="center-dialog-cancel">취소</button>
          <button type="submit" class="center-dialog-ok">확인</button>
        </div>
      </form>`;

    const form = overlay.querySelector("form");
    const input = overlay.querySelector("input");
    const error = overlay.querySelector(".center-dialog-error");

    error.textContent = errorMessage;
    error.style.display = errorMessage ? "" : "none";

    const finish = value => {
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(value);
    };

    const onKey = event => {
      if (event.key === "Escape") finish("");
    };

    form.addEventListener("submit", event => {
      event.preventDefault();
      const code = input.value.trim();
      if (!code) {
        error.textContent = "관리자 코드를 입력해주세요.";
        error.style.display = "";
        input.focus();
        return;
      }
      finish(code);
    });

    overlay.querySelector(".center-dialog-cancel").addEventListener("click", () => finish(""));

    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    input.focus();
  });
}

// 여러 요청이 동시에 코드를 필요로 해도 입력창은 하나만 띄우기
let adminCodePromise = null;
let adminCodeWrong = false;

async function getAdminCode() {
  try {
    const saved = sessionStorage.getItem(ADMIN_CODE_STORAGE_KEY);
    if (saved) return saved;
  } catch (e) {}

  if (!adminCodePromise) {
    const errorMessage = adminCodeWrong ? "관리자 코드가 올바르지 않습니다. 다시 입력해주세요." : "";
    adminCodeWrong = false;

    adminCodePromise = promptAdminCode(errorMessage).then(code => {
      try {
        if (code) sessionStorage.setItem(ADMIN_CODE_STORAGE_KEY, code);
      } catch (e) {}
      adminCodePromise = null;
      return code;
    });
  }

  return adminCodePromise;
}

function clearAdminCode() {
  try {
    sessionStorage.removeItem(ADMIN_CODE_STORAGE_KEY);
  } catch (e) {}
}

// 관리자 코드가 틀리면 다시 입력받아 재시도
async function adminFetch(url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await getAdminCode();

    if (!code) break;

    const response = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), "x-admin-code": code }
    });

    if (response.status !== 401) return response;

    // 같은 틀린 코드로 보낸 다른 요청이 이미 지웠다면 중복 안내하지 않기
    let saved = null;
    try { saved = sessionStorage.getItem(ADMIN_CODE_STORAGE_KEY); } catch (e) {}

    if (saved === code) {
      clearAdminCode();
      adminCodeWrong = true;
    }
  }

  return new Response(
    JSON.stringify({ message: "관리자 코드가 필요합니다." }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

// ==========================================
// 센터 / 공간 목록 (필터 드롭다운용)
// ==========================================

const centers = ["큰 서교센터", "작은 서교센터", "명동센터", "합정역센터"];

const roomsByCenter = {
  "큰 서교센터": ["강의실1(좌)", "강의실2(우)", "상담실1", "상담실2"],
  "작은 서교센터": ["강의실", "상담실"],
  "명동센터": ["강의실", "상담실1", "상담실2"],
  "합정역센터": ["강의실", "작은 상담실", "큰 상담실"]
};

const allRooms = [...new Set(Object.values(roomsByCenter).flat())];

// ==========================================
// 상태
// ==========================================

let allReservations = [];   // Supabase에서 불러온 전체 예약
let filteredReservations = []; // 필터 적용된 결과 (날짜별 개별 행, 엑셀 다운로드용)
let listItems = [];            // 목록에 보이는 줄 (고정예약은 묶음 1줄)
let currentPage = 1;
let pageSize = 10;
let selectedCenterCard = ""; // 센터별 현황 화면에서 선택된 센터

// ==========================================
// 데이터 불러오기
// ==========================================

// Supabase는 한 번에 최대 1000행까지만 돌려주므로 나눠서 불러온다
const FETCH_PAGE_SIZE = 1000;

async function fetchReservations() {
  try {
    const rows = [];

    for (let offset = 0; ; offset += FETCH_PAGE_SIZE) {
      const response = await adminFetch(
        `${ADMIN_API_URL}/Reservations?select=*&order=date.desc,start_time.desc,id.asc&limit=${FETCH_PAGE_SIZE}&offset=${offset}`,
        {
          headers: {
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
          }
        }
      );

      if (!response.ok) {
        console.error("예약 목록 조회 실패:", await response.text());
        allReservations = [];
        return;
      }

      const page = await response.json();
      rows.push(...page);

      if (page.length < FETCH_PAGE_SIZE) break;
    }

    allReservations = rows;

  } catch (error) {
    console.error("예약 목록 조회 오류:", error);
    allReservations = [];
  }
}

// ==========================================
// 화면 표시 / 오류 안내 유틸
// ==========================================

// 예약 값은 누구나 입력할 수 있으므로 화면에 넣기 전 항상 글자로만 바꾼다
function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// DB가 거절한 이유를 관리자가 이해할 수 있는 문장으로
async function describeSaveError(response) {
  let body = {};
  try { body = await response.clone().json(); } catch (e) {}
  console.error("저장 실패:", response.status, body);

  if (body.code === "23P01") return "같은 공간에 시간이 겹치는 예약이 이미 있어요. 주간 현황에서 빈 시간을 확인해주세요.";
  if (body.code === "22023" && body.message) return body.message;
  if (response.status === 401) return "관리자 코드를 다시 입력해주세요.";
  return "잠시 후 다시 시도해주세요." + (body.message ? `\n(${body.message})` : "");
}

// ==========================================
// 날짜 유틸
// ==========================================

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekRange(date) {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  if (isNaN(d)) return "-";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateLabel(dateString) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const d = new Date(dateString);
  return `${dateString} (${days[d.getDay()]})`;
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-11-26" → "2026.11.26 (목)"
function formatDateDots(dateString) {
  if (!dateString) return "-";
  const [y, m, d] = String(dateString).split("-").map(Number);
  const day = DAY_NAMES[new Date(y, m - 1, d).getDay()];
  return `${String(dateString).replace(/-/g, ".")} (${day})`;
}

// [2, 4] → "화·목" (월요일부터, 일요일은 맨 뒤)
function weekdaysLabel(weekdays) {
  if (!Array.isArray(weekdays)) return "";
  return [...new Set(weekdays.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map(n => DAY_NAMES[n])
    .join("·");
}

// ==========================================
// 부서별 색 (부서는 직접 입력이라 글자 포함 여부로 판단)
// 새 부서 색이 필요하면 여기에 한 줄 추가
// ==========================================

const DEPT_COLORS = [
  { key: "theology", label: "신학부", words: ["신학", "산학"] },
  { key: "youth",    label: "청년회", words: ["청년"] },
];
const DEPT_OTHER = { key: "other", label: "기타" };

function deptColorKey(department) {
  const text = String(department || "");
  const found = DEPT_COLORS.find(c => c.words.some(w => text.includes(w)));
  return (found || DEPT_OTHER).key;
}

function renderDeptLegend(container) {
  container.innerHTML = [...DEPT_COLORS, DEPT_OTHER]
    .map(c => `<span class="dept-legend-item"><i class="dept-dot dept-${c.key}"></i>${esc(c.label)}</span>`)
    .join("") + `<span class="dept-legend-item">🔁 고정예약</span>`;
}

// ==========================================
// 요약 카드
// ==========================================

function renderSummary() {
  const today = new Date();
  const todayStr = toDateString(today);

  const { start, end } = getWeekRange(today);
  const startStr = toDateString(start);
  const endStr = toDateString(end);

  const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const todayCount = allReservations.filter(r => r.date === todayStr).length;
  const weekCount = allReservations.filter(r => r.date >= startStr && r.date <= endStr).length;
  const monthCount = allReservations.filter(r => (r.date || "").startsWith(monthPrefix)).length;

  document.getElementById("statToday").textContent = `${todayCount}건`;
  document.getElementById("statTodayDate").textContent = formatDateLabel(todayStr);

  document.getElementById("statWeek").textContent = `${weekCount}건`;
  document.getElementById("statWeekRange").textContent = `${startStr} ~ ${endStr}`;

  document.getElementById("statMonth").textContent = `${monthCount}건`;
  document.getElementById("statMonthLabel").textContent = monthPrefix;

  document.getElementById("statTotal").textContent = `${allReservations.length}건`;
}

// ==========================================
// 필터 드롭다운 초기화
// ==========================================

function initFilterOptions() {
  const centerSelect = document.getElementById("filterCenter");
  centers.forEach(c => {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    centerSelect.appendChild(option);
  });

  updateRoomFilterOptions();

  // 센터를 바꾸면 그 센터에 맞는 공간 목록으로 갱신
  centerSelect.addEventListener("change", () => {
    updateRoomFilterOptions();
  });
}

// 필터 - 선택된 센터에 맞는 공간 목록으로 "공간" 드롭다운을 다시 그림
function updateRoomFilterOptions() {
  const center = document.getElementById("filterCenter").value;
  const roomSelect = document.getElementById("filterRoom");
  const currentValue = roomSelect.value;

  roomSelect.innerHTML = `<option value="">전체 공간</option>`;

  const rooms = center ? (roomsByCenter[center] || []) : allRooms;

  rooms.forEach(r => {
    const option = document.createElement("option");
    option.value = r;
    option.textContent = r;
    roomSelect.appendChild(option);
  });

  // 이전에 선택돼있던 공간이 새 목록에도 있으면 유지
  if (rooms.includes(currentValue)) {
    roomSelect.value = currentValue;
  }
}

// ==========================================
// 필터 적용
// ==========================================

function applyFilters() {
  const date = document.getElementById("filterDate").value;
  const center = document.getElementById("filterCenter").value;
  const room = document.getElementById("filterRoom").value;
  const name = document.getElementById("filterName").value.trim();
  const purpose = document.getElementById("filterPurpose").value.trim();
  const type = document.getElementById("filterType").value;

  filteredReservations = allReservations.filter(r => {
    if (date && r.date !== date) return false;
    if (center && r.center !== center) return false;
    if (room && r.room !== room) return false;
    if (name && !(r.user_name || "").includes(name)) return false;
    if (purpose && !(r.purpose || "").includes(purpose)) return false;
    if (type === "recurring" && !r.is_recurring) return false;
    if (type === "single" && r.is_recurring) return false;
    return true;
  });

  currentPage = 1;
  renderTable();
}

// 목록에 보여줄 줄: 일반 예약은 1건 = 1줄, 고정예약은 같은 묶음(recurring_group_id)을 1줄로
// 묶음 안 날짜 중 하나라도 필터에 맞으면 그 묶음을 보여준다
function buildListItems(rows, dateFilter) {
  const items = [];
  const seriesIndex = new Map();

  rows.forEach(r => {
    if (!(r.is_recurring && r.recurring_group_id)) {
      items.push({ type: "single", r, sortDate: r.date || "", sortTime: r.start_time || "" });
      return;
    }
    if (seriesIndex.has(r.recurring_group_id)) return;

    const all = allReservations
      .filter(item => item.recurring_group_id === r.recurring_group_id)
      .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.start_time || "").localeCompare(b.start_time || ""));

    const upcoming = all.filter(isUpcomingReservation);
    const pick =
      (dateFilter && all.find(item => item.date === dateFilter)) ||
      upcoming[0] ||
      all[all.length - 1] ||
      r;

    const item = {
      type: "series",
      r: pick,
      all,
      first: all[0] || r,
      last: all[all.length - 1] || r,
      upcomingCount: upcoming.length,
      sortDate: pick.date || "",
      sortTime: pick.start_time || ""
    };
    seriesIndex.set(r.recurring_group_id, item);
    items.push(item);
  });

  // 최근(미래) 날짜가 위로
  items.sort((a, b) => b.sortDate.localeCompare(a.sortDate) || b.sortTime.localeCompare(a.sortTime));
  return items;
}

function resetFilters() {
  document.getElementById("filterDate").value = "";
  document.getElementById("filterCenter").value = "";
  document.getElementById("filterRoom").value = "";
  document.getElementById("filterName").value = "";
  document.getElementById("filterPurpose").value = "";
  document.getElementById("filterType").value = "";

  filteredReservations = [...allReservations];
  currentPage = 1;
  renderTable();
}

// ==========================================
// 예약 목록 테이블 (예약 관리 화면)
// ==========================================

function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  listItems = buildListItems(filteredReservations, document.getElementById("filterDate").value);

  const seriesCount = listItems.filter(item => item.type === "series").length;
  document.getElementById("listTitle").textContent =
    `예약 목록 (총 ${listItems.length}건${seriesCount ? ` · 고정예약 ${seriesCount}건은 묶어서 표시` : ""})`;

  if (listItems.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="14">조건에 맞는 예약이 없습니다.</td></tr>`;
    renderPagination();
    return;
  }

  const totalPages = Math.max(1, Math.ceil(listItems.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = listItems.slice(start, start + pageSize);

  pageItems.forEach((item, index) => {
    const r = item.r;
    const isSeries = item.type === "series";
    const tr = document.createElement("tr");
    if (isSeries) tr.classList.add("series-row");

    const days = weekdaysLabel(r.recurring_weekdays);
    const typeLabel = isSeries
      ? `<span class="type-badge recurring">🔁 고정${days ? ` · 매주 ${days}` : ""} · 총 ${item.all.length}회</span>`
      : r.is_recurring
        ? `<span class="type-badge recurring">고정 ${esc(r.recurring_months)}개월</span>`
        : `<span class="type-badge single">일회성</span>`;

    const dateCell = isSeries
      ? `${formatDateDots(item.first.date)} ~<br>${formatDateDots(item.last.date)}`
      : formatDateLabel(r.date);

    tr.innerHTML = `
      <td>${listItems.length - (start + index)}</td>
      <td>${dateCell}</td>
      <td>${esc(r.start_time)} ~ ${esc(r.end_time)}</td>
      <td>${esc(r.center)}</td>
      <td>${esc(r.room)}</td>
      <td>${typeLabel}</td>
      <td>${esc(r.people)}</td>
      <td>${esc(r.user_name)}</td>
      <td>${esc(r.department)}</td>
      <td>${esc(r.region)}</td>
      <td>${esc(r.phone)}</td>
      <td>${esc(r.purpose)}</td>
      <td>${formatDateTime(r.created_at)}</td>
      <td>
        <button class="action-btn detail">상세</button>
        <button class="action-btn delete">${isSeries ? "남은 일정 삭제" : "삭제"}</button>
      </td>
    `;

    tr.querySelector(".action-btn.detail").addEventListener("click", () => renderDetailView(r));
    tr.querySelector(".action-btn.delete").addEventListener("click", () => {
      if (isSeries) deleteRecurringSeries(r.recurring_group_id, item.upcomingCount);
      else deleteReservation(r.id);
    });

    tbody.appendChild(tr);
  });

  renderPagination();
}

function renderPagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const totalPages = Math.max(1, Math.ceil(listItems.length / pageSize));

  const makeBtn = (label, page, disabled, active) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (active) btn.classList.add("active");
    btn.addEventListener("click", () => {
      currentPage = page;
      renderTable();
    });
    return btn;
  };

  pagination.appendChild(makeBtn("«", 1, currentPage === 1, false));
  pagination.appendChild(makeBtn("‹", Math.max(1, currentPage - 1), currentPage === 1, false));

  for (let p = 1; p <= totalPages; p++) {
    pagination.appendChild(makeBtn(String(p), p, false, p === currentPage));
  }

  pagination.appendChild(makeBtn("›", Math.min(totalPages, currentPage + 1), currentPage === totalPages, false));
  pagination.appendChild(makeBtn("»", totalPages, currentPage === totalPages, false));
}

// ==========================================
// 상세보기 모달
// ==========================================

function renderDetailView(r) {
  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <div class="modal-row"><span>센터</span><strong>${esc(r.center)}</strong></div>
    <div class="modal-row"><span>공간</span><strong>${esc(r.room)}</strong></div>
    <div class="modal-row"><span>날짜</span><strong>${formatDateLabel(r.date)}</strong></div>
    <div class="modal-row"><span>시간</span><strong>${esc(r.start_time)} ~ ${esc(r.end_time)}</strong></div>
    <div class="modal-row"><span>예약유형</span><strong>${r.is_recurring ? `고정 사용 · ${esc(r.recurring_months)}개월${weekdaysLabel(r.recurring_weekdays) ? ` · 매주 ${weekdaysLabel(r.recurring_weekdays)}` : ""}` : "일회성 사용"}</strong></div>
    <div class="modal-row"><span>인원</span><strong>${esc(r.people)}명</strong></div>
    <div class="modal-row"><span>예약자</span><strong>${esc(r.user_name)}</strong></div>
    <div class="modal-row"><span>부서</span><strong>${esc(r.department)}</strong></div>
    <div class="modal-row"><span>센터(지역)</span><strong>${esc(r.region)}</strong></div>
    <div class="modal-row"><span>연락처</span><strong>${esc(r.phone)}</strong></div>
    <div class="modal-row"><span>목적</span><strong>${esc(r.purpose)}</strong></div>
    <div class="modal-row"><span>신청일시</span><strong>${formatDateTime(r.created_at)}</strong></div>
  `;

  const editBtn = document.getElementById("modalEditBtn");
  editBtn.style.display = "";
  editBtn.onclick = () => renderDetailEditForm(r);

  const recurringActions = document.getElementById("modalRecurringActions");
  const deleteBtn = document.getElementById("modalDeleteBtn");

  // 고정예약은 아래 '이 날짜만 삭제 / 남은 일정 삭제'를 쓰고, 일반 예약은 여기서 바로 삭제
  deleteBtn.style.display = (r.is_recurring && r.recurring_group_id) ? "none" : "";
  deleteBtn.onclick = () => {
    document.getElementById("detailModal").classList.remove("show");
    deleteReservation(r.id);
  };

  if (r.is_recurring && r.recurring_group_id) {
    const series = allReservations.filter(item => item.recurring_group_id === r.recurring_group_id);
    const seriesCount = series.length;
    const upcomingCount = series.filter(isUpcomingReservation).length;

    document.getElementById("modalRecurringInfo").textContent =
      `이 예약은 고정(반복) 예약의 일부예요. 같은 시리즈로 총 ${seriesCount}건 중 남은 일정 ${upcomingCount}건이 있어요.`;

    recurringActions.style.display = "block";

    document.getElementById("deleteThisOnlyBtn").onclick = () => {
      document.getElementById("detailModal").classList.remove("show");
      deleteReservation(r.id);
    };

    document.getElementById("deleteSeriesBtn").onclick = () => {
      document.getElementById("detailModal").classList.remove("show");
      deleteRecurringSeries(r.recurring_group_id, upcomingCount);
    };

  } else {
    recurringActions.style.display = "none";
  }

//

  document.getElementById("detailModal").classList.add("show");
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("detailModal").classList.remove("show");
});

document.getElementById("detailModal").addEventListener("click", (e) => {
  if (e.target.id === "detailModal") {
    document.getElementById("detailModal").classList.remove("show");
  }
});

// ==========================================
// 상세보기 - 수정 모드 (모달 안에서 바로 수정)
// ==========================================
 
function renderDetailEditForm(r) {
  const modalBody = document.getElementById("modalBody");
 
  const roomOptions = (roomsByCenter[r.center] || [])
    .map(room => `<option value="${room}" ${room === r.room ? "selected" : ""}>${room}</option>`)
    .join("");
 
  const centerOptions = centers
    .map(c => `<option value="${c}" ${c === r.center ? "selected" : ""}>${c}</option>`)
    .join("");
 
  modalBody.innerHTML = `
    <form id="inlineEditForm" class="add-form">
      <div class="form-row">
        <div class="form-field">
          <label>센터<em>*</em></label>
          <select id="inlineEditCenter" required>${centerOptions}</select>
        </div>
        <div class="form-field">
          <label>공간<em>*</em></label>
          <select id="inlineEditRoom" required>${roomOptions}</select>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field">
          <label>날짜<em>*</em></label>
          <input type="date" id="inlineEditDate" value="${esc(r.date)}" required>
        </div>
        <div class="form-field">
          <label>인원<em>*</em></label>
          <input type="number" id="inlineEditPeople" min="1" value="${esc(r.people)}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field">
          <label>시작시간<em>*</em></label>
          <input type="time" id="inlineEditStartTime" step="1800" value="${esc(r.start_time)}" required>
        </div>
        <div class="form-field">
          <label>종료시간<em>*</em></label>
          <input type="time" id="inlineEditEndTime" step="1800" value="${esc(r.end_time)}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field">
          <label>예약자<em>*</em></label>
          <input type="text" id="inlineEditUserName" value="${esc(r.user_name)}" required>
        </div>
        <div class="form-field">
          <label>부서<em>*</em></label>
          <input type="text" id="inlineEditDepartment" value="${esc(r.department)}" required>
        </div>
        <div class="form-field">
          <label>센터(지역)<em>*</em></label>
          <input type="text" id="inlineEditRegion" value="${esc(r.region)}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field full">
          <label>연락처<em>*</em></label>
          <input type="tel" id="inlineEditPhone" value="${esc(r.phone)}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field full">
          <label>목적<em>*</em></label>
          <textarea id="inlineEditPurpose" rows="3" required>${esc(r.purpose)}</textarea>
        </div>
      </div>
 
      <div class="form-actions">
        <button type="button" id="inlineEditCancelBtn" class="filter-reset">취소</button>
        <button type="submit" id="inlineEditSaveBtn" class="filter-search">저장하기</button>
      </div>
    </form>

    ${r.is_recurring && r.recurring_group_id ? `
      <div class="modal-recurring-actions">
        <p>이 예약은 고정(반복) 예약의 일부예요. 반복 기간을 바꾸면 같은 시리즈의 날짜가 새 기간에 맞춰 추가되거나 삭제돼요.</p>
        <div class="form-row">
          <div class="form-field">
            <label>반복 기간</label>
            <select id="inlineEditRecurringMonths">
              <option value="1" ${r.recurring_months === 1 ? "selected" : ""}>1개월</option>
              <option value="3" ${r.recurring_months === 3 ? "selected" : ""}>3개월</option>
              <option value="6" ${r.recurring_months === 6 ? "selected" : ""}>6개월</option>
              <option value="custom" ${![1, 3, 6].includes(r.recurring_months) ? "selected" : ""}>직접입력</option>
            </select>
          </div>
          <div class="form-field">
            <label>개월 수</label>
            <input type="number" id="inlineEditRecurringMonthsCustom" min="1" max="24"
              value="${esc(r.recurring_months || 1)}"
              style="${[1, 3, 6].includes(r.recurring_months) ? "display:none;" : ""}">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" id="applyRecurringMonthsBtn" class="action-btn">반복 기간 적용</button>
        </div>
      </div>
    ` : ""}
  `;

  // 수정 모드에서는 수정버튼/삭제버튼/시리즈삭제 버튼 숨김
  document.getElementById("modalEditBtn").style.display = "none";
  document.getElementById("modalDeleteBtn").style.display = "none";
  document.getElementById("modalRecurringActions").style.display = "none";

  // 센터를 바꾸면 그 센터의 공간 목록으로 갱신
  document.getElementById("inlineEditCenter").addEventListener("change", (e) => {
    const roomSelect = document.getElementById("inlineEditRoom");
    roomSelect.innerHTML = (roomsByCenter[e.target.value] || [])
      .map(room => `<option value="${room}">${room}</option>`)
      .join("");
  });

  if (r.is_recurring && r.recurring_group_id) {
    const monthsSelect = document.getElementById("inlineEditRecurringMonths");
    const monthsCustom = document.getElementById("inlineEditRecurringMonthsCustom");

    monthsSelect.addEventListener("change", () => {
      monthsCustom.style.display = monthsSelect.value === "custom" ? "block" : "none";
    });

    document.getElementById("applyRecurringMonthsBtn").addEventListener("click", () => {
      const months = monthsSelect.value === "custom"
        ? Math.max(1, Math.min(24, Number(monthsCustom.value) || 1))
        : Number(monthsSelect.value);

      applyRecurringMonthsChange(r, months);
    });
  }
 
  document.getElementById("inlineEditCancelBtn").addEventListener("click", () => {
    renderDetailView(r);
  });
 
  document.getElementById("inlineEditForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveInlineEdit(r.id);
  });
}
 
async function saveInlineEdit(id) {
  const center = document.getElementById("inlineEditCenter").value;
  const room = document.getElementById("inlineEditRoom").value;
  const date = document.getElementById("inlineEditDate").value;
  const startTime = document.getElementById("inlineEditStartTime").value;
  const endTime = document.getElementById("inlineEditEndTime").value;
  const people = Number(document.getElementById("inlineEditPeople").value);
  const userName = document.getElementById("inlineEditUserName").value.trim();
  const department = document.getElementById("inlineEditDepartment").value.trim();
  const region = document.getElementById("inlineEditRegion").value.trim();
  const phone = document.getElementById("inlineEditPhone").value.trim();
  const purpose = document.getElementById("inlineEditPurpose").value.trim();
 
  if (!center || !room) { showAlert("센터와 공간을 선택해주세요."); return; }
  if (!date) { showAlert("날짜를 선택해주세요."); return; }
  if (!startTime || !endTime) { showAlert("시작시간과 종료시간을 입력해주세요."); return; }
  if (startTime >= endTime) { showAlert("종료시간은 시작시간보다 늦어야 해요."); return; }
  if (!people || people < 1) { showAlert("인원을 확인해주세요."); return; }
  if (!userName || !department || !region || !phone || !purpose) { showAlert("예약자 정보를 모두 입력해주세요."); return; }
 
  const saveBtn = document.getElementById("inlineEditSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중...";
 
  try {
    const response = await adminFetch(
      `${ADMIN_API_URL}/Reservations?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          center, room, date,
          start_time: startTime,
          end_time: endTime,
          people,
          user_name: userName,
          department,
          region,
          phone,
          purpose
        })
      }
    );
 
    if (!response.ok) {
      showAlert("예약 수정에 실패했습니다.\n\n" + await describeSaveError(response));
      saveBtn.disabled = false;
      saveBtn.textContent = "저장하기";
      return;
    }
 
    await fetchReservations();
    applyFilters();
    renderSummary();
    renderTodayView();
    renderCenterView();
    renderWeeklyAdminView();
    renderStatsView();
 
    const updated = allReservations.find(item => String(item.id) === String(id));
 
    if (updated) {
      renderDetailView(updated);
    } else {
      document.getElementById("detailModal").classList.remove("show");
    }
 
  } catch (error) {
    console.error("예약 수정 오류:", error);
    showAlert("예약 수정 중 문제가 발생했습니다.");
    saveBtn.disabled = false;
    saveBtn.textContent = "저장하기";
  }
}

// ==========================================
// 고정(반복) 예약 - 반복 기간 변경
// ==========================================

function generateWeeklyDates(startDateStr, months, weekdays) {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  const targetDays = weekdays.length > 0 ? weekdays : [start.getDay()];
  const dates = [];
  const current = new Date(start);

  while (current < end) {
    if (targetDays.includes(current.getDay())) {
      dates.push(toDateString(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

async function applyRecurringMonthsChange(r, newMonths) {
  if (newMonths === r.recurring_months) {
    showAlert("반복 기간이 변경되지 않았어요.");
    return;
  }

  const seriesRows = allReservations.filter(
    item => item.recurring_group_id === r.recurring_group_id
  );

  const startDate = seriesRows.map(item => item.date).sort()[0];

  const weekdays = Array.isArray(r.recurring_weekdays) && r.recurring_weekdays.length > 0
    ? r.recurring_weekdays
    : [new Date(`${startDate}T00:00:00`).getDay()];

  const newDates = generateWeeklyDates(startDate, newMonths, weekdays);

  const existingDates = new Set(seriesRows.map(item => item.date));
  const newDatesSet = new Set(newDates);

  const datesToDelete = [...existingDates].filter(d => !newDatesSet.has(d));
  const datesToAdd = newDates.filter(d => !existingDates.has(d));

  const ok = await showConfirm(
    `반복 기간을 ${newMonths}개월로 변경하면\n` +
    `${datesToDelete.length}건이 삭제되고, ${datesToAdd.length}건이 추가돼요.\n\n진행할까요?`
  );

  if (!ok) return;

  try {
    if (datesToDelete.length > 0) {
      const dateFilter = `in.(${datesToDelete.map(d => `"${d}"`).join(",")})`;

      const response = await adminFetch(
        `${ADMIN_API_URL}/Reservations?recurring_group_id=eq.${encodeURIComponent(r.recurring_group_id)}&date=${encodeURIComponent(dateFilter)}`,
        {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
          }
        }
      );

      if (!response.ok) {
        showAlert("반복 기간 축소에 실패했습니다.");
        console.error("반복 기간 축소 실패:", await response.text());
        return;
      }
    }

    if (datesToAdd.length > 0) {
      const template = seriesRows[0];
      const rooms = [...new Set(seriesRows.map(item => item.room).filter(Boolean))];
      const skipped = [];
      const rows = [];

      datesToAdd.forEach(date => {
        rooms.forEach(room => {
          const conflict = allReservations.some(item =>
            item.recurring_group_id !== r.recurring_group_id &&
            item.center === template.center &&
            item.room === room &&
            item.date === date &&
            item.start_time < template.end_time &&
            item.end_time > template.start_time
          );

          if (conflict) {
            skipped.push(`${date} (${room})`);
            return;
          }

          rows.push({
            center: template.center,
            room,
            date,
            start_time: template.start_time,
            end_time: template.end_time,
            people: template.people,
            user_name: template.user_name,
            department: template.department,
            region: template.region,
            phone: template.phone,
            purpose: template.purpose,
            reservation_password_hash: template.reservation_password_hash,
            is_recurring: true,
            recurring_months: newMonths,
            recurring_group_id: r.recurring_group_id,
            recurring_weekdays: weekdays
          });
        });
      });

      if (rows.length > 0) {
        const response = await adminFetch(
          `${ADMIN_API_URL}/Reservations`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_PUBLISHABLE_KEY,
              "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
              "Prefer": "return=representation"
            },
            body: JSON.stringify(rows)
          }
        );

        if (!response.ok) {
          showAlert("반복 기간 연장에 실패했습니다.\n\n" + await describeSaveError(response));
          return;
        }
      }

      if (skipped.length > 0) {
        showAlert("다음 날짜는 이미 다른 예약이 있어 추가하지 못했어요:\n" + skipped.join("\n"));
      }
    }

    const monthsResponse = await adminFetch(
      `${ADMIN_API_URL}/Reservations?recurring_group_id=eq.${encodeURIComponent(r.recurring_group_id)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({ recurring_months: newMonths })
      }
    );

    if (!monthsResponse.ok) {
      console.error("반복 개월 수 갱신 실패:", await monthsResponse.text());
    }

    await fetchReservations();
    applyFilters();
    renderSummary();
    renderTodayView();
    renderCenterView();
    renderWeeklyAdminView();
    renderStatsView();

    const updated = allReservations.find(item => String(item.id) === String(r.id))
      || allReservations.find(item => item.recurring_group_id === r.recurring_group_id);

    if (updated) {
      renderDetailView(updated);
    } else {
      document.getElementById("detailModal").classList.remove("show");
    }

    showAlert("반복 기간이 변경되었습니다.");

  } catch (error) {
    console.error("반복 기간 변경 오류:", error);
    showAlert("반복 기간 변경 중 문제가 발생했습니다.");
  }
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("detailModal").classList.remove("show");
});
 
document.getElementById("detailModal").addEventListener("click", (e) => {
  if (e.target.id === "detailModal") {
    document.getElementById("detailModal").classList.remove("show");
  }
});

// ==========================================
// 예약 직접 추가
// ==========================================

const addModal = document.getElementById("addModal");
const addForm = document.getElementById("addForm");
const addCenterSelect = document.getElementById("addCenter");
const addRoomSelect = document.getElementById("addRoom");

// 센터 select 옵션 채우기 (최초 1회)
centers.forEach(c => {
  const option = document.createElement("option");
  option.value = c;
  option.textContent = c;
  addCenterSelect.appendChild(option);
});

// 센터를 고르면 그 센터의 공간만 표시
addCenterSelect.addEventListener("change", () => {
  const center = addCenterSelect.value;
  addRoomSelect.innerHTML = "";

  if (!center) {
    addRoomSelect.innerHTML = `<option value="">센터를 먼저 선택해주세요</option>`;
    return;
  }

  addRoomSelect.innerHTML = `<option value="">선택해주세요</option>`;
  (roomsByCenter[center] || []).forEach(room => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    addRoomSelect.appendChild(option);
  });
});

function openAddModal() {
  addForm.reset();
  addRoomSelect.innerHTML = `<option value="">센터를 먼저 선택해주세요</option>`;
  addModal.classList.add("show");
}

function closeAddModal() {
  addModal.classList.remove("show");
}

document.getElementById("addReservationBtn").addEventListener("click", openAddModal);
document.getElementById("closeAddModal").addEventListener("click", closeAddModal);
document.getElementById("cancelAddBtn").addEventListener("click", closeAddModal);

addModal.addEventListener("click", (e) => {
  if (e.target.id === "addModal") closeAddModal();
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const center = addCenterSelect.value;
  const room = addRoomSelect.value;
  const date = document.getElementById("addDate").value;
  const startTime = document.getElementById("addStartTime").value;
  const endTime = document.getElementById("addEndTime").value;
  const people = Number(document.getElementById("addPeople").value);
  const userName = document.getElementById("addUserName").value.trim();
  const department = document.getElementById("addDepartment").value.trim();
  const region = document.getElementById("addRegion").value.trim();
  const phone = document.getElementById("addPhone").value.trim();
  const purpose = document.getElementById("addPurpose").value.trim();

  if (!center || !room) { showAlert("센터와 공간을 선택해주세요."); return; }
  if (!date) { showAlert("날짜를 선택해주세요."); return; }
  if (!startTime || !endTime) { showAlert("시작시간과 종료시간을 입력해주세요."); return; }
  if (startTime >= endTime) { showAlert("종료시간은 시작시간보다 늦어야 해요."); return; }
  if (!people || people < 1) { showAlert("인원을 확인해주세요."); return; }
  if (!userName || !department || !region || !phone || !purpose) { showAlert("예약자 정보를 모두 입력해주세요."); return; }

  const submitBtn = document.getElementById("submitAddBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "추가 중...";

  try {
    const response = await adminFetch(
      `${ADMIN_API_URL}/Reservations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          center, room, date,
          start_time: startTime,
          end_time: endTime,
          people,
          user_name: userName,
          department,
          region,
          phone,
          purpose
        })
      }
    );

    if (!response.ok) {
      showAlert("예약 추가에 실패했습니다.\n\n" + await describeSaveError(response));
      return;
    }

    closeAddModal();

    await fetchReservations();
    applyFilters();
    renderSummary();
    renderTodayView();
    renderCenterView();
    renderWeeklyAdminView();
    renderStatsView();

  } catch (error) {
    console.error("예약 추가 오류:", error);
    showAlert("예약 추가 중 문제가 발생했습니다.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "추가하기";
  }
});

// ==========================================
// 삭제
// ==========================================

async function deleteReservation(id) {
  const ok = await showConfirm("이 예약을 정말 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.");
  if (!ok) return;

  try {
    const response = await adminFetch(
      `${ADMIN_API_URL}/Reservations?id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      showAlert("삭제에 실패했습니다. (Supabase에 delete 정책이 설정되어 있는지 확인해주세요)");
      console.error("삭제 실패:", await response.text());
      return;
    }

    allReservations = allReservations.filter(r => String(r.id) !== String(id));

    applyFilters();
    renderSummary();
    renderTodayView();
    renderCenterView();
    renderWeeklyAdminView();
    renderStatsView();

  } catch (error) {
    console.error("삭제 오류:", error);
    showAlert("삭제 중 문제가 발생했습니다.");
  }
}

// ==========================================
// 고정(반복) 예약 - 남은 일정 삭제
// (이미 지난 일정은 기록으로 남기고, 아직 시작하지 않은 일정만 삭제)
// ==========================================

function nowHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function isUpcomingReservation(r) {
  const todayStr = toDateString(new Date());
  return r.date > todayStr || (r.date === todayStr && (r.start_time || "") > nowHHMM());
}

async function deleteRecurringSeries(groupId, count) {
  if (!count) {
    showAlert("이 고정예약은 남은 일정이 없어요.\n이미 지난 일정은 기록으로 남겨둡니다.");
    return;
  }

  const ok = await showConfirm(
    `이 고정예약의 남은 일정 ${count}건을 삭제하시겠습니까?\n이미 지난 일정은 기록으로 그대로 남습니다.\n삭제하면 되돌릴 수 없습니다.`
  );
  if (!ok) return;

  const todayStr = toDateString(new Date());
  const upcomingFilter = `(date.gt.${todayStr},and(date.eq.${todayStr},start_time.gt.${nowHHMM()}))`;

  try {
    const response = await adminFetch(
      `${ADMIN_API_URL}/Reservations?recurring_group_id=eq.${encodeURIComponent(groupId)}&or=${encodeURIComponent(upcomingFilter)}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          "Prefer": "return=representation"
        }
      }
    );

    if (!response.ok) {
      showAlert("삭제에 실패했습니다.");
      console.error("남은 일정 삭제 실패:", await response.text());
      return;
    }

    const deleted = await response.json();
    const deletedIds = new Set(deleted.map(r => String(r.id)));
    count = deleted.length;

    allReservations = allReservations.filter(r => !deletedIds.has(String(r.id)));

    applyFilters();
    renderSummary();
    renderTodayView();
    renderCenterView();
    renderWeeklyAdminView();
    renderStatsView();

    showAlert(`남은 일정 ${count}건이 삭제됐어요. 지난 일정은 기록으로 남아 있어요.`);

  } catch (error) {
    console.error("남은 일정 삭제 오류:", error);
    showAlert("삭제 중 문제가 발생했습니다.");
  }
}

// ==========================================
// 엑셀(CSV) 다운로드
// ==========================================

function exportCSV(reservations = filteredReservations, fileName = `예약목록_${toDateString(new Date())}.csv`) {
  const headers = ["날짜", "시간", "센터", "공간", "예약유형", "인원", "예약자", "부서", "지역", "연락처", "목적", "신청일시"];

  const rows = reservations.map(r => [
    r.date,
    `${r.start_time} ~ ${r.end_time}`,
    r.center,
    r.room,
    r.is_recurring ? `고정 ${r.recurring_months}개월` : "일회성",
    r.people,
    r.user_name,
    r.department,
    r.region,
    r.phone,
    (r.purpose || "").replace(/\n/g, " "),
    formatDateTime(r.created_at)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
}

// ==========================================
// 오래된 예약 정리 (설정 화면)
// ==========================================

// 기준일 이전에 "완전히 끝난" 예약만 대상으로 한다.
// 고정예약은 시리즈의 마지막 날짜까지 기준일 이전일 때만 포함한다.
// (시리즈 일부만 지우면 반복 기간 변경 시 시작일이 달라지기 때문)
function getCleanupCutoff(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return toDateString(d);
}

function getCleanupTargets(cutoff) {
  const seriesLastDate = {};

  allReservations.forEach(r => {
    if (!r.recurring_group_id) return;
    const last = seriesLastDate[r.recurring_group_id];
    if (!last || r.date > last) seriesLastDate[r.recurring_group_id] = r.date;
  });

  return allReservations.filter(r => {
    if (r.date >= cutoff) return false;
    if (r.recurring_group_id) return seriesLastDate[r.recurring_group_id] < cutoff;
    return true;
  });
}

// 지우는 건수만큼 텔레그램 취소 알림이 나가므로, 알림 일시중지 기능이 생기기 전까지 잠가 둔다
const CLEANUP_ENABLED = false;

function renderCleanupInfo() {
  const months = Number(document.getElementById("cleanupMonths").value);
  const cutoff = getCleanupCutoff(months);
  const targets = getCleanupTargets(cutoff);

  document.getElementById("cleanupInfo").innerHTML =
    `<b>${cutoff}</b> 이전에 끝난 예약 <b>${targets.length}건</b>이 정리 대상이에요. (전체 ${allReservations.length}건)` +
    (CLEANUP_ENABLED ? "" : "<br>텔레그램 알림 일시중지 기능이 생기면 정리할 수 있어요.");

  document.getElementById("cleanupBtn").disabled = !CLEANUP_ENABLED || targets.length === 0;
}

async function cleanupOldReservations() {
  if (!CLEANUP_ENABLED) return;

  const months = Number(document.getElementById("cleanupMonths").value);
  const cutoff = getCleanupCutoff(months);
  const targets = getCleanupTargets(cutoff);

  if (targets.length === 0) {
    showAlert("정리할 예약이 없어요.");
    return;
  }

  const ok = await showConfirm(
    `${cutoff} 이전에 끝난 예약 ${targets.length}건을 정리합니다.\n\n` +
    `먼저 백업 파일(CSV)이 다운로드되고, 그 다음 DB에서 삭제돼요.\n삭제하면 되돌릴 수 없습니다. 진행할까요?`
  );
  if (!ok) return;

  exportCSV(targets, `예약백업_${cutoff}이전_${toDateString(new Date())}.csv`);

  const backedUp = await showConfirm(
    "백업 파일이 다운로드됐는지 확인해주세요.\n\n파일을 확인했다면 [확인]을 눌러 삭제를 진행하세요."
  );
  if (!backedUp) return;

  const btn = document.getElementById("cleanupBtn");
  btn.disabled = true;

  // URL 길이 제한을 피하려고 100건씩 나눠 삭제
  const ids = targets.map(r => r.id);
  const deletedIds = new Set();

  try {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);

      const response = await adminFetch(
        `${ADMIN_API_URL}/Reservations?id=in.(${chunk.join(",")})`,
        {
          method: "DELETE",
          headers: {
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
          }
        }
      );

      if (!response.ok) {
        console.error("오래된 예약 정리 실패:", await response.text());
        showAlert(`삭제 중 오류가 발생했어요. (${deletedIds.size}건 삭제 후 중단)`);
        break;
      }

      chunk.forEach(id => deletedIds.add(String(id)));
    }
  } catch (error) {
    console.error("오래된 예약 정리 오류:", error);
    showAlert(`삭제 중 문제가 발생했어요. (${deletedIds.size}건 삭제 후 중단)`);
  }

  allReservations = allReservations.filter(r => !deletedIds.has(String(r.id)));

  applyFilters();
  renderSummary();
  renderCleanupInfo();

  if (deletedIds.size === ids.length) {
    showAlert(`총 ${deletedIds.size}건을 정리했어요.`);
  }
}

document.getElementById("cleanupMonths").addEventListener("change", renderCleanupInfo);
document.getElementById("cleanupBtn").addEventListener("click", cleanupOldReservations);

// ==========================================
// 오늘 예약 화면
// ==========================================

function renderTodayView() {
  const todayStr = toDateString(new Date());
  document.getElementById("todayDateLabel").textContent = `${formatDateLabel(todayStr)} 예약 목록`;

  const rows = allReservations.filter(r => r.date === todayStr)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

  const tbody = document.getElementById("todayTableBody");
  tbody.innerHTML = "";

  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="10">오늘 예약이 없습니다.</td></tr>`;
    return;
  }

  rows.forEach((r, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${esc(r.start_time)} ~ ${esc(r.end_time)}</td>
      <td>${esc(r.center)}</td>
      <td>${esc(r.room)}</td>
      <td>${esc(r.people)}</td>
      <td>${esc(r.user_name)}</td>
      <td>${esc(r.department)}</td>
      <td>${esc(r.region)}</td>
      <td>${esc(r.phone)}</td>
      <td>${esc(r.purpose)}</td>
      <td>
        <button class="action-btn detail" data-id="${esc(r.id)}">상세</button>
        <button class="action-btn edit" data-id="${esc(r.id)}">수정</button>
        <button class="action-btn delete" data-id="${esc(r.id)}">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".action-btn.detail").forEach(btn => {
  btn.addEventListener("click", () => {
    const reservation = allReservations.find(
      item => String(item.id) === String(btn.dataset.id)
    );

    if (reservation) {
      renderDetailView(reservation);
    }
  });
});

tbody.querySelectorAll(".action-btn.edit").forEach(btn => {
  btn.addEventListener("click", () => {
    const reservation = allReservations.find(
      item => String(item.id) === String(btn.dataset.id)
    );

    if (reservation) {
      renderDetailEditForm(reservation);
      document.getElementById("detailModal").classList.add("show");
    }
  });
});

tbody.querySelectorAll(".action-btn.delete").forEach(btn => {
  btn.addEventListener("click", () => {
    deleteReservation(btn.dataset.id);
  });
});
}

// ==========================================
// 센터별 예약 현황 화면
// ==========================================

function renderCenterView() {
  const cardsWrap = document.getElementById("centerCards");
  cardsWrap.innerHTML = "";

  centers.forEach(center => {
    const count = allReservations.filter(r => r.center === center).length;

    const card = document.createElement("div");
    card.className = "center-stat-card";
    if (selectedCenterCard === center) card.classList.add("active");

    card.innerHTML = `
      <strong>${center}</strong>
      <div class="count">${count}<span>건</span></div>
    `;

    card.addEventListener("click", () => {
      selectedCenterCard = selectedCenterCard === center ? "" : center;
      renderCenterView();
    });

    cardsWrap.appendChild(card);
  });

  document.getElementById("centerListTitle").textContent =
    selectedCenterCard ? `${selectedCenterCard} 예약 목록` : "전체 센터";

  const rows = (selectedCenterCard
    ? allReservations.filter(r => r.center === selectedCenterCard)
    : allReservations
  ).slice(0, 100); // 너무 많으면 100건까지만 표시

  const tbody = document.getElementById("centerTableBody");
  tbody.innerHTML = "";

  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">예약이 없습니다.</td></tr>`;
    return;
  }

  rows.forEach((r, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDateLabel(r.date)}</td>
      <td>${esc(r.start_time)} ~ ${esc(r.end_time)}</td>
      <td>${esc(r.center)}</td>
      <td>${esc(r.room)}</td>
      <td>${esc(r.people)}</td>
      <td>${esc(r.user_name)}</td>
      <td>${esc(r.phone)}</td>
      <td>${esc(r.purpose)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 주간 예약 현황 (관리자)
// ==========================================


function initWeeklyFilterOptions() {
  const centerSelect = document.getElementById("weeklyFilterCenter");
  centers.forEach(c => {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    centerSelect.appendChild(option);
  });

  updateWeeklyRoomOptions();

  centerSelect.addEventListener("change", () => {
    updateWeeklyRoomOptions();
    renderWeeklyAdminView();
  });

  document.getElementById("weeklyFilterRoom").addEventListener("change", renderWeeklyAdminView);
}

function updateWeeklyRoomOptions() {
  const center = document.getElementById("weeklyFilterCenter").value;
  const roomSelect = document.getElementById("weeklyFilterRoom");
  const currentValue = roomSelect.value;

  roomSelect.innerHTML = `<option value="">전체 공간</option>`;

  const rooms = center ? (roomsByCenter[center] || []) : allRooms;

  rooms.forEach(r => {
    const option = document.createElement("option");
    option.value = r;
    option.textContent = r;
    roomSelect.appendChild(option);
  });

  if (rooms.includes(currentValue)) {
    roomSelect.value = currentValue;
  }
}

// 보기 상태: 주간 / 월간, 기준 날짜, 월간에서 선택한 날, '날짜로 이동'으로 고른 날
let calMode = "week";
let calAnchor = startOfDay(new Date());
let calSelected = toDateString(new Date());
let calJumped = "";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDateStr(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getWeeklyAdminDates() {
  const start = startOfDay(calAnchor);
  start.setDate(start.getDate() - start.getDay());

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// 센터·공간 필터를 적용한 기간 내 예약
function getCalendarRows(startStr, endStr) {
  const center = document.getElementById("weeklyFilterCenter").value;
  const room = document.getElementById("weeklyFilterRoom").value;

  return allReservations.filter(r => {
    if (r.date < startStr || r.date > endStr) return false;
    if (center && r.center !== center) return false;
    if (room && r.room !== room) return false;
    return true;
  });
}

function rowsOnDate(rows, dateStr) {
  return rows
    .filter(r => r.date === dateStr)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
}

// 예약 카드 (주간 표 · 월간 오른쪽 목록 공용) — 누르면 상세 창
function makeReservationCard(r) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `week-admin-reservation dept-${deptColorKey(r.department)}`;
  card.title = "눌러서 상세보기·수정·삭제";
  card.innerHTML = `
    <div class="week-admin-reservation-time">${esc(r.start_time)} ~ ${esc(r.end_time)}${r.is_recurring ? ` <span class="week-admin-recurring" title="고정예약">🔁</span>` : ""}</div>
    <div class="week-admin-reservation-name">${esc(r.center)} · ${esc(r.room)}</div>
    <div class="week-admin-reservation-meta">${esc(r.user_name)} / ${esc(r.department)}</div>
  `;
  card.addEventListener("click", () => renderDetailView(r));
  return card;
}

function renderWeeklyAdminView() {
  const isMonth = calMode === "month";

  document.querySelectorAll("#calModeToggle button").forEach(b => {
    b.setAttribute("aria-pressed", b.dataset.mode === calMode ? "true" : "false");
  });
  document.getElementById("weeklyThisWeek").textContent = isMonth ? "이번달" : "이번주";
  document.getElementById("weeklyPrev").setAttribute("aria-label", isMonth ? "이전 달" : "이전 주");
  document.getElementById("weeklyNext").setAttribute("aria-label", isMonth ? "다음 달" : "다음 주");
  document.getElementById("weeklyAdminCalendar").hidden = isMonth;
  document.getElementById("monthlyAdminView").hidden = !isMonth;

  if (isMonth) renderMonthlyView();
  else renderWeekGrid();
}

function renderWeekGrid() {
  const dates = getWeeklyAdminDates();
  const startStr = toDateString(dates[0]);
  const endStr = toDateString(dates[6]);

  document.getElementById("weeklyAdminRange").textContent =
    `${dates[0].getFullYear()}년 ${dates[0].getMonth() + 1}월 ${dates[0].getDate()}일 ~ ${dates[6].getMonth() + 1}월 ${dates[6].getDate()}일`;

  const weekRows = getCalendarRows(startStr, endStr);
  const todayStr = toDateString(new Date());

  const calendar = document.getElementById("weeklyAdminCalendar");
  calendar.innerHTML = "";

  dates.forEach((date, index) => {
    const dateStr = toDateString(date);

    const dayColumn = document.createElement("div");
    dayColumn.className = "week-admin-day";
    if (dateStr === calJumped) dayColumn.classList.add("jumped");

    const header = document.createElement("div");
    header.className = "week-admin-day-header";
    if (index === 0) header.classList.add("sun");
    if (index === 6) header.classList.add("sat");
    if (dateStr === todayStr) header.classList.add("today");

    header.innerHTML = `
      <span class="day-name">${DAY_NAMES[index]}</span>
      <span class="day-number">${date.getDate()}</span>
    `;

    const body = document.createElement("div");
    body.className = "week-admin-day-body";

    const dayReservations = rowsOnDate(weekRows, dateStr);
    if (dayReservations.length === 0) {
      body.innerHTML = `<div class="week-admin-empty">예약 없음</div>`;
    }
    dayReservations.forEach(r => body.appendChild(makeReservationCard(r)));

    dayColumn.appendChild(header);
    dayColumn.appendChild(body);
    calendar.appendChild(dayColumn);
  });
}

// ==========================================
// 월간 보기: 날짜를 누르면 오른쪽에 그날 예약 목록
// ==========================================

const MONTH_CELL_MAX = 3;

function renderMonthlyView() {
  const year = calAnchor.getFullYear();
  const month = calAnchor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + (6 - last.getDay()));

  document.getElementById("weeklyAdminRange").textContent = `${year}년 ${month + 1}월`;

  const rows = getCalendarRows(toDateString(gridStart), toDateString(gridEnd));
  const todayStr = toDateString(new Date());

  // 선택한 날이 이 달이 아니면: 오늘(이 달일 때) 또는 1일
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  if (!calSelected.startsWith(monthPrefix)) {
    calSelected = todayStr.startsWith(monthPrefix) ? todayStr : toDateString(first);
  }

  const grid = document.getElementById("monthlyAdminGrid");
  grid.innerHTML = DAY_NAMES
    .map((n, i) => `<div class="month-head${i === 0 ? " sun" : i === 6 ? " sat" : ""}">${n}</div>`)
    .join("");

  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = toDateString(d);
    const dayRows = rowsOnDate(rows, dateStr);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "month-cell";
    cell.dataset.date = dateStr;
    if (d.getMonth() !== month) cell.classList.add("other-month");
    if (d.getDay() === 0) cell.classList.add("sun");
    if (d.getDay() === 6) cell.classList.add("sat");
    if (dateStr === todayStr) cell.classList.add("today");
    if (dateStr === calSelected) cell.classList.add("selected");
    cell.setAttribute("aria-label", `${formatDateDots(dateStr)} 예약 ${dayRows.length}건`);

    const items = dayRows.slice(0, MONTH_CELL_MAX).map(r =>
      `<span class="month-item dept-${deptColorKey(r.department)}">${esc(r.start_time)} ${esc(r.user_name)}${r.is_recurring ? " 🔁" : ""}</span>`
    ).join("");
    const more = dayRows.length > MONTH_CELL_MAX ? `<span class="month-more">+${dayRows.length - MONTH_CELL_MAX}건</span>` : "";

    cell.innerHTML = `<span class="month-day">${d.getDate()}</span>${items}${more}`;
    cell.addEventListener("click", () => {
      calSelected = dateStr;
      grid.querySelectorAll(".month-cell.selected").forEach(c => c.classList.remove("selected"));
      cell.classList.add("selected");
      renderMonthDayPanel(rows);
    });
    grid.appendChild(cell);
  }

  renderMonthDayPanel(rows);
}

function renderMonthDayPanel(rows) {
  const dayRows = rowsOnDate(rows, calSelected);
  document.getElementById("monthDayTitle").textContent = `${formatDateDots(calSelected)} 예약 ${dayRows.length}건`;

  const list = document.getElementById("monthDayList");
  list.innerHTML = "";
  if (dayRows.length === 0) {
    list.innerHTML = `<div class="week-admin-empty">예약 없음</div>`;
    return;
  }
  dayRows.forEach(r => list.appendChild(makeReservationCard(r)));
}

// ==========================================
// 주간/월간 전환 · 이동
// ==========================================

function moveCalendar(step) {
  const next = new Date(calAnchor);
  if (calMode === "month") {
    next.setDate(1);
    next.setMonth(next.getMonth() + step);
  } else {
    next.setDate(next.getDate() + step * 7);
  }
  calAnchor = next;
  calJumped = "";
  renderWeeklyAdminView();
}

document.getElementById("weeklyPrev").addEventListener("click", () => moveCalendar(-1));
document.getElementById("weeklyNext").addEventListener("click", () => moveCalendar(1));

document.getElementById("weeklyThisWeek").addEventListener("click", () => {
  calAnchor = startOfDay(new Date());
  calSelected = toDateString(calAnchor);
  calJumped = "";
  document.getElementById("calJumpDate").value = "";
  renderWeeklyAdminView();
});

document.querySelectorAll("#calModeToggle button").forEach(b => {
  b.addEventListener("click", () => {
    if (calMode === b.dataset.mode) return;
    calMode = b.dataset.mode;
    renderWeeklyAdminView();
  });
});

document.getElementById("calJumpDate").addEventListener("change", (e) => {
  const value = e.target.value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  calAnchor = parseDateStr(value);
  calSelected = value;
  calJumped = value;
  renderWeeklyAdminView();
});

// ==========================================
// 통계 화면
// ==========================================

function renderStatsView() {
  const total = allReservations.length;

  // 평균 이용시간
  let totalMinutes = 0;
  let validCount = 0;

  allReservations.forEach(r => {
    if (!r.start_time || !r.end_time) return;
    const [sh, sm] = r.start_time.split(":").map(Number);
    const [eh, em] = r.end_time.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) {
      totalMinutes += diff;
      validCount++;
    }
  });

  const avgMinutes = validCount ? Math.round(totalMinutes / validCount) : 0;
  const avgLabel = avgMinutes ? `${Math.floor(avgMinutes / 60)}시간 ${avgMinutes % 60}분` : "-";

  // 가장 많이 쓰인 센터
  const centerCounts = {};
  centers.forEach(c => centerCounts[c] = 0);
  allReservations.forEach(r => { if (r.center in centerCounts) centerCounts[r.center]++; });

  const topCenter = Object.entries(centerCounts).sort((a, b) => b[1] - a[1])[0];

  const statsCards = document.getElementById("statsCards");
  statsCards.innerHTML = `
    <div class="summary-card">
      <div class="summary-icon blue">📦</div>
      <div><span>전체 예약</span><strong>${total}건</strong></div>
    </div>
    <div class="summary-card">
      <div class="summary-icon green">⏱</div>
      <div><span>평균 이용시간</span><strong>${avgLabel}</strong></div>
    </div>
    <div class="summary-card">
      <div class="summary-icon purple">⭐</div>
      <div><span>가장 인기있는 센터</span><strong>${topCenter && topCenter[1] > 0 ? topCenter[0] : "-"}</strong></div>
    </div>
  `;

  // 센터별 막대그래프
  const maxCenterCount = Math.max(1, ...Object.values(centerCounts));
  const centerBarChart = document.getElementById("centerBarChart");
  centerBarChart.innerHTML = Object.entries(centerCounts).map(([name, count]) => `
    <div class="bar-row">
      <div class="bar-label">${name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / maxCenterCount) * 100}%"></div></div>
      <div class="bar-value">${count}건</div>
    </div>
  `).join("");

  // 공간 유형(강의실/상담실) 막대그래프
  let lectureCount = 0;
  let counselCount = 0;

  allReservations.forEach(r => {
    if ((r.room || "").startsWith("강의실")) lectureCount++;
    else if ((r.room || "").startsWith("상담실")) counselCount++;
  });

  const maxRoomCount = Math.max(1, lectureCount, counselCount);
  const roomTypeBarChart = document.getElementById("roomTypeBarChart");
  roomTypeBarChart.innerHTML = `
    <div class="bar-row">
      <div class="bar-label">강의실</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(lectureCount / maxRoomCount) * 100}%"></div></div>
      <div class="bar-value">${lectureCount}건</div>
    </div>
    <div class="bar-row">
      <div class="bar-label">상담실</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(counselCount / maxRoomCount) * 100}%"></div></div>
      <div class="bar-value">${counselCount}건</div>
    </div>
  `;
}

// ==========================================
// 사이드바 화면 전환
// ==========================================

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".admin-view").forEach(v => v.classList.remove("active"));
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");

    if (btn.dataset.view === "today") renderTodayView();
    if (btn.dataset.view === "byCenter") renderCenterView();
    if (btn.dataset.view === "weekly") renderWeeklyAdminView();
    if (btn.dataset.view === "stats") renderStatsView();
    if (btn.dataset.view === "inquiries") loadInquiries();
    if (btn.dataset.view === "settings") renderCleanupInfo();
  });
});

// ==========================================
// 필터/버튼 이벤트
// ==========================================

document.getElementById("searchBtn").addEventListener("click", applyFilters);
document.getElementById("resetBtn").addEventListener("click", resetFilters);
document.getElementById("refreshBtn").addEventListener("click", async () => {
  await fetchReservations();
  applyFilters();
  renderSummary();
  renderWeeklyAdminView();
});
document.getElementById("exportBtn").addEventListener("click", () => exportCSV());

document.getElementById("pageSizeSelect").addEventListener("change", (e) => {
  pageSize = Number(e.target.value);
  currentPage = 1;
  renderTable();
});

// ==========================================
// 초기 실행
// ==========================================

async function init() {
  initFilterOptions();
  initWeeklyFilterOptions();
  await fetchReservations();

  filteredReservations = [...allReservations];

  renderSummary();
  renderTable();
  renderDeptLegend(document.getElementById("weeklyLegend"));
  renderWeeklyAdminView();
}

init();


// ==========================================
// 문의 (사이트 '문의'로 접수된 내용)
// ==========================================

let allInquiries = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function updateInquiryBadge() {
  const badge = document.getElementById("inquiryBadge");
  if (!badge) return;
  const pending = allInquiries.filter(q => q.status === "접수").length;
  badge.textContent = String(pending);
  badge.hidden = pending === 0;
}

async function loadInquiries() {
  try {
    const response = await adminFetch(
      `${ADMIN_API_URL}/Inquiries?select=*&order=created_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      console.error("문의 불러오기 실패:", await response.text());
      return;
    }

    allInquiries = await response.json();
    updateInquiryBadge();
    renderInquiries();

  } catch (error) {
    console.error("문의 불러오기 오류:", error);
  }
}

function renderInquiries() {
  const tbody = document.getElementById("inquiryTableBody");
  if (!tbody) return;

  const status = document.getElementById("inquiryFilterStatus").value;
  const type = document.getElementById("inquiryFilterType").value;

  const rows = allInquiries.filter(q =>
    (!status || q.status === status) && (!type || q.inquiry_type === type)
  );

  document.getElementById("inquiryListTitle").textContent = `문의 목록 (총 ${rows.length}건)`;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8">조건에 맞는 문의가 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(q => {
    const done = q.status === "처리완료";
    return `
      <tr class="${done ? "inquiry-done" : ""}">
        <td>${escapeHtml(formatDateTime(q.created_at))}</td>
        <td><span class="type-badge ${q.inquiry_type === "웹사이트 기능" ? "single" : "recurring"}">${escapeHtml(q.inquiry_type)}</span></td>
        <td>${escapeHtml(q.department)}</td>
        <td>${q.name ? escapeHtml(q.name) : '<span class="muted">익명</span>'}</td>
        <td>${q.phone ? escapeHtml(q.phone) : '<span class="muted">-</span>'}</td>
        <td class="inquiry-content">${escapeHtml(q.content)}</td>
        <td><span class="inquiry-status ${done ? "done" : "pending"}">${escapeHtml(q.status)}</span></td>
        <td>
          <button class="action-btn detail" data-inquiry-toggle="${q.id}">${done ? "접수로 되돌리기" : "처리완료"}</button>
          <button class="action-btn delete" data-inquiry-delete="${q.id}">삭제</button>
        </td>
      </tr>`;
  }).join("");
}

async function setInquiryStatus(id) {
  const q = allInquiries.find(item => String(item.id) === String(id));
  if (!q) return;

  const next = q.status === "처리완료" ? "접수" : "처리완료";

  const response = await adminFetch(
    `${ADMIN_API_URL}/Inquiries?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: next })
    }
  );

  if (!response.ok) {
    showAlert("상태 변경에 실패했습니다.");
    console.error("문의 상태 변경 실패:", await response.text());
    return;
  }

  q.status = next;
  updateInquiryBadge();
  renderInquiries();
}

async function deleteInquiry(id) {
  const ok = await showConfirm("이 문의를 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.", "삭제", "취소");
  if (!ok) return;

  const response = await adminFetch(
    `${ADMIN_API_URL}/Inquiries?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    }
  );

  if (!response.ok) {
    showAlert("삭제에 실패했습니다.");
    console.error("문의 삭제 실패:", await response.text());
    return;
  }

  allInquiries = allInquiries.filter(item => String(item.id) !== String(id));
  updateInquiryBadge();
  renderInquiries();
}

document.getElementById("inquiryTableBody")?.addEventListener("click", event => {
  const toggle = event.target.closest("[data-inquiry-toggle]");
  if (toggle) setInquiryStatus(toggle.dataset.inquiryToggle);

  const del = event.target.closest("[data-inquiry-delete]");
  if (del) deleteInquiry(del.dataset.inquiryDelete);
});

document.getElementById("inquiryFilterStatus")?.addEventListener("change", renderInquiries);
document.getElementById("inquiryFilterType")?.addEventListener("change", renderInquiries);
document.getElementById("inquiryReload")?.addEventListener("click", loadInquiries);

// 처음 열 때 미처리 문의 개수(사이드바 배지)를 보여주기 위해 한 번 불러오기
loadInquiries();
