// ==========================================
// Supabase 연결 (예약 페이지와 동일한 프로젝트)
// ==========================================

const SUPABASE_URL = "https://ohnxhlbwzakwzhzhkhvt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v8DnBpF4GX4oABnGOfpRxA_QH6ruB5Q";

// ==========================================
// 센터 / 공간 목록 (필터 드롭다운용)
// ==========================================

const centers = ["큰 서교센터", "작은 서교센터", "명동센터", "합정역센터"];

const roomsByCenter = {
  "큰 서교센터": ["강의실1(좌)", "강의실2(우)", "상담실1", "상담실2"],
  "작은 서교센터": ["강의실", "상담실"],
  "명동센터": ["강의실", "상담실1", "상담실2"],
  "합정역센터": ["강의실", "상담실"]
};

const allRooms = [...new Set(Object.values(roomsByCenter).flat())];

// ==========================================
// 상태
// ==========================================

let allReservations = [];   // Supabase에서 불러온 전체 예약
let filteredReservations = []; // 필터 적용된 결과
let currentPage = 1;
let pageSize = 10;
let selectedCenterCard = ""; // 센터별 현황 화면에서 선택된 센터

// ==========================================
// 데이터 불러오기
// ==========================================

async function fetchReservations() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Reservations?select=*&order=date.desc,start_time.desc`,
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

    allReservations = await response.json();

  } catch (error) {
    console.error("예약 목록 조회 오류:", error);
    allReservations = [];
  }
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

  document.getElementById("listTitle").textContent = `예약 목록 (총 ${filteredReservations.length}건)`;

  if (filteredReservations.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="13">조건에 맞는 예약이 없습니다.</td></tr>`;
    renderPagination();
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredReservations.slice(start, start + pageSize);

  pageItems.forEach((r, index) => {
    const tr = document.createElement("tr");
    const typeLabel = r.is_recurring
      ? `<span class="type-badge recurring">고정 ${r.recurring_months || ""}개월</span>`
      : `<span class="type-badge single">일회성</span>`;
    tr.innerHTML = `
      <td>${filteredReservations.length - (start + index)}</td>
      <td>${formatDateLabel(r.date)}</td>
      <td>${r.start_time || ""} ~ ${r.end_time || ""}</td>
      <td>${r.center || ""}</td>
      <td>${r.room || ""}</td>
      <td>${typeLabel}</td>
      <td>${r.people || ""}</td>
      <td>${r.user_name || ""}</td>
      <td>${r.department || ""}</td>
      <td>${r.region || ""}</td>
      <td>${r.phone || ""}</td>
      <td>${r.purpose || ""}</td>
      <td>${formatDateTime(r.created_at)}</td>
      <td>
        <button class="action-btn detail" data-id="${r.id}">상세</button>
        <button class="action-btn delete" data-id="${r.id}">삭제</button>
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

tbody.querySelectorAll(".action-btn.delete").forEach(btn => {
  btn.addEventListener("click", () => {
    deleteReservation(btn.dataset.id);
  });
});

  renderPagination();
}

function renderPagination() {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / pageSize));

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
    <div class="modal-row"><span>센터</span><strong>${r.center || ""}</strong></div>
    <div class="modal-row"><span>공간</span><strong>${r.room || ""}</strong></div>
    <div class="modal-row"><span>날짜</span><strong>${formatDateLabel(r.date)}</strong></div>
    <div class="modal-row"><span>시간</span><strong>${r.start_time} ~ ${r.end_time}</strong></div>
    <div class="modal-row"><span>예약유형</span><strong>${r.is_recurring ? `고정 사용 · ${r.recurring_months}개월` : "일회성 사용"}</strong></div>
    <div class="modal-row"><span>인원</span><strong>${r.people}명</strong></div>
    <div class="modal-row"><span>예약자</span><strong>${r.user_name || ""}</strong></div>
    <div class="modal-row"><span>부서</span><strong>${r.department || ""}</strong></div>
    <div class="modal-row"><span>센터(지역)</span><strong>${r.region || ""}</strong></div>
    <div class="modal-row"><span>연락처</span><strong>${r.phone || ""}</strong></div>
    <div class="modal-row"><span>목적</span><strong>${r.purpose || ""}</strong></div>
    <div class="modal-row"><span>신청일시</span><strong>${formatDateTime(r.created_at)}</strong></div>
  `;

  const editBtn = document.getElementById("modalEditBtn");
  editBtn.onclick = () => renderDetailEditForm(r);

  const recurringActions = document.getElementById("modalRecurringActions");

  if (r.is_recurring && r.recurring_group_id) {
    const seriesCount = allReservations.filter(item => item.recurring_group_id === r.recurring_group_id).length;

    document.getElementById("modalRecurringInfo").textContent =
      `이 예약은 고정(반복) 예약의 일부예요. 같은 시리즈로 총 ${seriesCount}건이 등록되어 있어요.`;

    recurringActions.style.display = "block";

    document.getElementById("deleteThisOnlyBtn").onclick = () => {
      document.getElementById("detailModal").classList.remove("show");
      deleteReservation(r.id);
    };

    document.getElementById("deleteSeriesBtn").onclick = () => {
      document.getElementById("detailModal").classList.remove("show");
      deleteRecurringSeries(r.recurring_group_id, seriesCount);
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
          <input type="date" id="inlineEditDate" value="${r.date}" required>
        </div>
        <div class="form-field">
          <label>인원<em>*</em></label>
          <input type="number" id="inlineEditPeople" min="1" value="${r.people}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field">
          <label>시작시간<em>*</em></label>
          <input type="time" id="inlineEditStartTime" step="1800" value="${r.start_time}" required>
        </div>
        <div class="form-field">
          <label>종료시간<em>*</em></label>
          <input type="time" id="inlineEditEndTime" step="1800" value="${r.end_time}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field">
          <label>예약자<em>*</em></label>
          <input type="text" id="inlineEditUserName" value="${r.user_name || ""}" required>
        </div>
        <div class="form-field">
          <label>부서<em>*</em></label>
          <input type="text" id="inlineEditDepartment" value="${r.department || ""}" required>
        </div>
        <div class="form-field">
          <label>센터(지역)<em>*</em></label>
          <input type="text" id="inlineEditRegion" value="${r.region || ""}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field full">
          <label>연락처<em>*</em></label>
          <input type="tel" id="inlineEditPhone" value="${r.phone || ""}" required>
        </div>
      </div>
 
      <div class="form-row">
        <div class="form-field full">
          <label>목적<em>*</em></label>
          <textarea id="inlineEditPurpose" rows="3" required>${r.purpose || ""}</textarea>
        </div>
      </div>
 
      <div class="form-actions">
        <button type="button" id="inlineEditCancelBtn" class="filter-reset">취소</button>
        <button type="submit" id="inlineEditSaveBtn" class="filter-search">저장하기</button>
      </div>
    </form>
  `;
 
  // 수정 모드에서는 수정버튼/시리즈삭제 버튼 숨김
  document.getElementById("modalEditBtn").style.display = "none";
  document.getElementById("modalRecurringActions").style.display = "none";
 
  // 센터를 바꾸면 그 센터의 공간 목록으로 갱신
  document.getElementById("inlineEditCenter").addEventListener("change", (e) => {
    const roomSelect = document.getElementById("inlineEditRoom");
    roomSelect.innerHTML = (roomsByCenter[e.target.value] || [])
      .map(room => `<option value="${room}">${room}</option>`)
      .join("");
  });
 
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
 
  if (!center || !room) { alert("센터와 공간을 선택해주세요."); return; }
  if (!date) { alert("날짜를 선택해주세요."); return; }
  if (!startTime || !endTime) { alert("시작시간과 종료시간을 입력해주세요."); return; }
  if (startTime >= endTime) { alert("종료시간은 시작시간보다 늦어야 해요."); return; }
  if (!people || people < 1) { alert("인원을 확인해주세요."); return; }
  if (!userName || !department || !region || !phone || !purpose) { alert("예약자 정보를 모두 입력해주세요."); return; }
 
  const saveBtn = document.getElementById("inlineEditSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중...";
 
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Reservations?id=eq.${id}`,
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
 
    const result = await response.json();
 
    if (!response.ok) {
      console.error("예약 수정 실패:", result);
      alert("예약 수정에 실패했습니다.\n\n" + JSON.stringify(result, null, 2) +
        "\n\n(Supabase에 update 정책/권한이 설정되어 있는지 확인해주세요)");
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
    alert("예약 수정 중 문제가 발생했습니다.");
    saveBtn.disabled = false;
    saveBtn.textContent = "저장하기";
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

  if (!center || !room) { alert("센터와 공간을 선택해주세요."); return; }
  if (!date) { alert("날짜를 선택해주세요."); return; }
  if (!startTime || !endTime) { alert("시작시간과 종료시간을 입력해주세요."); return; }
  if (startTime >= endTime) { alert("종료시간은 시작시간보다 늦어야 해요."); return; }
  if (!people || people < 1) { alert("인원을 확인해주세요."); return; }
  if (!userName || !department || !region || !phone || !purpose) { alert("예약자 정보를 모두 입력해주세요."); return; }

  const submitBtn = document.getElementById("submitAddBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "추가 중...";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Reservations`,
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

    const result = await response.json();

    if (!response.ok) {
      console.error("예약 추가 실패:", result);
      alert("예약 추가에 실패했습니다.\n\n" + JSON.stringify(result, null, 2));
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
    alert("예약 추가 중 문제가 발생했습니다.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "추가하기";
  }
});

// ==========================================
// 삭제
// ==========================================

async function deleteReservation(id) {
  const ok = confirm("이 예약을 정말 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.");
  if (!ok) return;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Reservations?id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      alert("삭제에 실패했습니다. (Supabase에 delete 정책이 설정되어 있는지 확인해주세요)");
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
    alert("삭제 중 문제가 발생했습니다.");
  }
}

// ==========================================
// 고정(반복) 예약 - 전체 시리즈 삭제
// ==========================================

async function deleteRecurringSeries(groupId, count) {
  const ok = confirm(
    `이 고정예약 시리즈는 총 ${count}건이에요.\n전체 ${count}건을 모두 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.`
  );
  if (!ok) return;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/Reservations?recurring_group_id=eq.${encodeURIComponent(groupId)}`,
      {
        method: "DELETE",
        headers: {
          "apikey": SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
      }
    );

    if (!response.ok) {
      alert("삭제에 실패했습니다.");
      console.error("전체 시리즈 삭제 실패:", await response.text());
      return;
    }

    allReservations = allReservations.filter(r => r.recurring_group_id !== groupId);

    applyFilters();
    renderSummary();
    renderTodayView();
    renderCenterView();
    renderWeeklyAdminView();
    renderStatsView();

    alert(`총 ${count}건이 모두 삭제됐어요.`);

  } catch (error) {
    console.error("전체 시리즈 삭제 오류:", error);
    alert("삭제 중 문제가 발생했습니다.");
  }
}

// ==========================================
// 엑셀(CSV) 다운로드
// ==========================================

function exportCSV() {
  const headers = ["날짜", "시간", "센터", "공간", "예약유형", "인원", "예약자", "부서", "연락처", "목적", "신청일시"];

  const rows = filteredReservations.map(r => [
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
  a.download = `예약목록_${toDateString(new Date())}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

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
      <td>${r.start_time} ~ ${r.end_time}</td>
      <td>${r.center || ""}</td>
      <td>${r.room || ""}</td>
      <td>${r.people || ""}</td>
      <td>${r.user_name || ""}</td>
      <td>${r.department || ""}</td>
      <td>${r.region || ""}</td>
      <td>${r.phone || ""}</td>
      <td>${r.purpose || ""}</td>
      <td>
        <button class="action-btn detail" data-id="${r.id}">상세</button>
        <button class="action-btn edit" data-id="${r.id}">수정</button>
        <button class="action-btn delete" data-id="${r.id}">삭제</button>
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
      <td>${r.start_time} ~ ${r.end_time}</td>
      <td>${r.center || ""}</td>
      <td>${r.room || ""}</td>
      <td>${r.people || ""}</td>
      <td>${r.user_name || ""}</td>
      <td>${r.phone || ""}</td>
      <td>${r.purpose || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 주간 예약 현황 (관리자)
// ==========================================

let weeklyAdminOffset = 0;

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

function getWeeklyAdminDates() {
  const base = new Date();
  base.setDate(base.getDate() + weeklyAdminOffset * 7);

  const day = base.getDay();
  const start = new Date(base);
  start.setDate(base.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function renderWeeklyAdminView() {
  const dates = getWeeklyAdminDates();
  const startStr = toDateString(dates[0]);
  const endStr = toDateString(dates[6]);

  document.getElementById("weeklyAdminRange").textContent =
    `${dates[0].getFullYear()}년 ${dates[0].getMonth() + 1}월 ${dates[0].getDate()}일 ~ ${dates[6].getMonth() + 1}월 ${dates[6].getDate()}일`;

  const center = document.getElementById("weeklyFilterCenter").value;
  const room = document.getElementById("weeklyFilterRoom").value;

  const weekRows = allReservations.filter(r => {
    if (r.date < startStr || r.date > endStr) return false;
    if (center && r.center !== center) return false;
    if (room && r.room !== room) return false;
    return true;
  });

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const todayStr = toDateString(new Date());

  const calendar = document.getElementById("weeklyAdminCalendar");
  calendar.innerHTML = "";

  dates.forEach((date, index) => {
    const dateStr = toDateString(date);

    const dayColumn = document.createElement("div");
    dayColumn.className = "week-admin-day";

    const header = document.createElement("div");
    header.className = "week-admin-day-header";
    if (index === 0) header.classList.add("sun");
    if (index === 6) header.classList.add("sat");
    if (dateStr === todayStr) header.classList.add("today");

    header.innerHTML = `
      <span class="day-name">${dayNames[index]}</span>
      <span class="day-number">${date.getDate()}</span>
    `;

    const body = document.createElement("div");
    body.className = "week-admin-day-body";

    const dayReservations = weekRows
      .filter(r => r.date === dateStr)
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

    if (dayReservations.length === 0) {
      body.innerHTML = `<div class="week-admin-empty">예약 없음</div>`;
    }

    dayReservations.forEach(r => {
      const card = document.createElement("div");
      card.className = "week-admin-reservation";
      card.innerHTML = `
        <div class="week-admin-reservation-time">${r.start_time} ~ ${r.end_time}</div>
        <div class="week-admin-reservation-name">${r.center} · ${r.room}</div>
        <div class="week-admin-reservation-meta">${r.user_name || ""} / ${r.department || ""}</div>
      `;
      body.appendChild(card);
    });

    dayColumn.appendChild(header);
    dayColumn.appendChild(body);
    calendar.appendChild(dayColumn);
  });
}

document.getElementById("weeklyPrev").addEventListener("click", () => {
  weeklyAdminOffset--;
  renderWeeklyAdminView();
});

document.getElementById("weeklyNext").addEventListener("click", () => {
  weeklyAdminOffset++;
  renderWeeklyAdminView();
});

document.getElementById("weeklyThisWeek").addEventListener("click", () => {
  weeklyAdminOffset = 0;
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
document.getElementById("exportBtn").addEventListener("click", exportCSV);

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
}

init();
