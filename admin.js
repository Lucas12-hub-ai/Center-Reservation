// ==========================================================
// 공간 예약 관리자 admin.js
// 현재 admin.html 기준으로 작성된 전체 코드
// ==========================================================


// ==========================================================
// 1. SUPABASE
// ==========================================================

const SUPABASE_URL =
  "https://ohnxhlbwzakwzhzhkhvt.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_v8DnBpF4GX4oABnGOfpRxA_QH6ruB5Q";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


// ==========================================================
// 2. 센터 / 공간
// ==========================================================

const centers = {

  "서교1센터": {
    capacity: 50,
    open: "06:00",
    close: "24:00"
  },

  "서교2센터": {
    capacity: 55,
    open: "06:00",
    close: "24:00"
  },

  "명동센터": {
    capacity: 100,
    open: "06:00",
    close: "24:00"
  },

  "합정역센터": {
    capacity: 100,
    open: "06:00",
    close: "24:00"
  }

};


const roomsByCenter = {

  "서교1센터": [
    "강의실1",
    "강의실2",
    "상담실1",
    "상담실2"
  ],

  "서교2센터": [
    "강의실",
    "상담실"
  ],

  "명동센터": [
    "강의실",
    "상담실1",
    "상담실2"
  ],

  "합정역센터": [
    "강의실",
    "상담실"
  ]

};


// ==========================================================
// 3. 상태
// ==========================================================

let reservations = [];

let filteredReservations = [];

let currentPage = 1;

let pageSize = 10;

let currentView = "dashboard";

let selectedAdminDates = [];

let selectedRecurringDays = [];


// ==========================================================
// 4. 유틸리티
// ==========================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function timeToMinutes(time) {

  if (!time) return 0;

  if (time === "24:00") {
    return 1440;
  }

  const parts = time.split(":");

  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );

}


function minutesToTime(minutes) {

  if (minutes >= 1440) {
    return "24:00";
  }

  const hour =
    Math.floor(minutes / 60);

  const minute =
    minutes % 60;

  return (
    String(hour).padStart(2, "0") +
    ":" +
    String(minute).padStart(2, "0")
  );

}


function dateToString(date) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function formatDate(dateString) {

  if (!dateString) {
    return "";
  }

  const parts =
    dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  return (
    `${parts[0]}년 ` +
    `${Number(parts[1])}월 ` +
    `${Number(parts[2])}일`
  );

}


function formatDateShort(dateString) {

  if (!dateString) return "";

  const parts =
    dateString.split("-");

  return `${Number(parts[1])}/${Number(parts[2])}`;

}


function getDayName(dateString) {

  const date =
    new Date(`${dateString}T00:00:00`);

  const names = [
    "일",
    "월",
    "화",
    "수",
    "목",
    "금",
    "토"
  ];

  return names[date.getDay()];

}


function getTodayString() {

  return dateToString(
    new Date()
  );

}


function getStartOfWeek(date) {

  const result =
    new Date(date);

  const day =
    result.getDay();

  result.setDate(
    result.getDate() - day
  );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;

}


function getEndOfWeek(date) {

  const result =
    getStartOfWeek(date);

  result.setDate(
    result.getDate() + 6
  );

  return result;

}


function formatDateTime(value) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


// ==========================================================
// 5. DOM
// ==========================================================

const $ = id =>
  document.getElementById(id);


// ==========================================================
// 6. 센터 옵션 초기화
// ==========================================================

function populateCenterSelects() {

  const selects = [

    $("filterCenter"),
    $("weeklyFilterCenter"),
    $("addCenter")

  ];

  selects.forEach(select => {

    if (!select) return;

    const firstOption =
      select.options[0];

    select.innerHTML = "";

    if (firstOption) {

      const option =
        document.createElement("option");

      option.value =
        firstOption.value;

      option.textContent =
        firstOption.textContent;

      select.appendChild(option);

    }

    Object.keys(centers)
      .forEach(centerName => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          centerName;

        option.textContent =
          centerName;

        select.appendChild(
          option
        );

      });

  });

}


// ==========================================================
// 7. 공간 옵션 초기화
// ==========================================================

function populateRoomSelect(
  select,
  center,
  includeAll = false
) {

  if (!select) return;

  select.innerHTML = "";

  const firstOption =
    document.createElement("option");

  firstOption.value = "";

  firstOption.textContent =
    includeAll
      ? "전체 공간"
      : "센터를 먼저 선택해주세요";

  select.appendChild(
    firstOption
  );

  if (!center) {
    return;
  }

  const rooms =
    roomsByCenter[center] || [];

  rooms.forEach(room => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      room;

    option.textContent =
      room;

    select.appendChild(
      option
    );

  });

}


// ==========================================================
// 8. 필터 센터 변경
// ==========================================================

if ($("filterCenter")) {

  $("filterCenter")
    .addEventListener(
      "change",
      () => {

        populateRoomSelect(
          $("filterRoom"),
          $("filterCenter").value,
          true
        );

      }
    );

}


// ==========================================================
// 9. 주간 센터 변경
// ==========================================================

if ($("weeklyFilterCenter")) {

  $("weeklyFilterCenter")
    .addEventListener(
      "change",
      () => {

        populateRoomSelect(
          $("weeklyFilterRoom"),
          $("weeklyFilterCenter").value,
          true
        );

        renderWeeklyCalendar();

      }
    );

}


if ($("weeklyFilterRoom")) {

  $("weeklyFilterRoom")
    .addEventListener(
      "change",
      renderWeeklyCalendar
    );

}


// ==========================================================
// 10. 예약 추가 센터 변경
// ==========================================================

if ($("addCenter")) {

  $("addCenter")
    .addEventListener(
      "change",
      () => {

        populateRoomSelect(
          $("addRoom"),
          $("addCenter").value,
          false
        );

        updateAddReservationSummary();

      }
    );

}


// ==========================================================
// 11. 시간 옵션
// ==========================================================

function populateAddTimeOptions() {

  const startSelect =
    $("addStartTime");

  const endSelect =
    $("addEndTime");

  if (!startSelect || !endSelect) {
    return;
  }

  startSelect.innerHTML =
    `<option value="">시작시간</option>`;

  endSelect.innerHTML =
    `<option value="">종료시간</option>`;

  let open = 360;

  let close = 1440;

  const center =
    $("addCenter")
      ? $("addCenter").value
      : "";

  if (
    center &&
    centers[center]
  ) {

    open =
      timeToMinutes(
        centers[center].open
      );

    close =
      timeToMinutes(
        centers[center].close
      );

  }

  for (
    let minute = open;
    minute <= close;
    minute += 30
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      minutesToTime(minute);

    option.textContent =
      minutesToTime(minute);

    startSelect.appendChild(
      option
    );

  }

  for (
    let minute = open + 30;
    minute <= close;
    minute += 30
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      minutesToTime(minute);

    option.textContent =
      minutesToTime(minute);

    endSelect.appendChild(
      option
    );

  }

}


populateAddTimeOptions();


// ==========================================================
// 12. 예약 추가 모달
// ==========================================================

function openAddModal() {

  const modal =
    $("addModal");

  if (!modal) return;

  resetAddForm();

  modal.classList.add(
    "active"
  );

}


function closeAddModal() {

  const modal =
    $("addModal");

  if (!modal) return;

  modal.classList.remove(
    "active"
  );

}


if ($("addReservationBtn")) {

  $("addReservationBtn")
    .addEventListener(
      "click",
      openAddModal
    );

}


if ($("closeAddModal")) {

  $("closeAddModal")
    .addEventListener(
      "click",
      closeAddModal
    );

}


if ($("cancelAddBtn")) {

  $("cancelAddBtn")
    .addEventListener(
      "click",
      closeAddModal
    );

}


// 모달 바깥 클릭

if ($("addModal")) {

  $("addModal")
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("addModal")
        ) {

          closeAddModal();

        }

      }
    );

}


// ==========================================================
// 13. 예약 유형
// ==========================================================

document
  .querySelectorAll(
    'input[name="adminReservationType"]'
  )
  .forEach(input => {

    input.addEventListener(
      "change",
      updateReservationTypeUI
    );

  });


function getReservationType() {

  const selected =
    document.querySelector(
      'input[name="adminReservationType"]:checked'
    );

  return selected
    ? selected.value
    : "single";

}


function updateReservationTypeUI() {

  const type =
    getReservationType();

  const recurringOptions =
    $("recurringOptions");

  const singleDateGroup =
    $("singleDateGroup");

  if (type === "recurring") {

    if (recurringOptions) {

      recurringOptions.style.display =
        "block";

    }

    if (singleDateGroup) {

      singleDateGroup.style.display =
        "none";

    }

  }

  else {

    if (recurringOptions) {

      recurringOptions.style.display =
        "none";

    }

    if (singleDateGroup) {

      singleDateGroup.style.display =
        "block";

    }

  }

  updateAddReservationSummary();

}


// ==========================================================
// 14. 일회성 날짜 선택
// ==========================================================

if ($("addDatePicker")) {

  $("addDatePicker")
    .addEventListener(
      "change",
      () => {

        const date =
          $("addDatePicker").value;

        if (!date) return;

        if (
          !selectedAdminDates.includes(
            date
          )
        ) {

          selectedAdminDates.push(
            date
          );

          selectedAdminDates.sort();

        }

        $("addDatePicker").value =
          "";

        renderSelectedDates();

        updateAddReservationSummary();

      }
    );

}


function renderSelectedDates() {

  const box =
    $("selectedDates");

  if (!box) return;

  if (
    selectedAdminDates.length === 0
  ) {

    box.innerHTML =
      `<span class="selected-date-empty">
        선택된 날짜가 없습니다.
      </span>`;

    return;

  }

  box.innerHTML =
    selectedAdminDates
      .map(date => `

        <button
          type="button"
          class="selected-date-chip"
          data-date="${date}"
        >
          ${escapeHTML(
            formatDateShort(date)
          )}
          (${getDayName(date)})
          <span>×</span>
        </button>

      `)
      .join("");

  box
    .querySelectorAll(
      ".selected-date-chip"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectedAdminDates =
            selectedAdminDates.filter(
              date =>
                date !==
                button.dataset.date
            );

          renderSelectedDates();

          updateAddReservationSummary();

        }
      );

    });

}


if ($("clearSelectedDates")) {

  $("clearSelectedDates")
    .addEventListener(
      "click",
      () => {

        selectedAdminDates = [];

        renderSelectedDates();

        updateAddReservationSummary();

      }
    );

}


// ==========================================================
// 15. 고정 요일 선택
// ==========================================================

if ($("adminRecurringDays")) {

  $("adminRecurringDays")
    .querySelectorAll(
      "button[data-day]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const day =
            Number(
              button.dataset.day
            );

          if (
            selectedRecurringDays
              .includes(day)
          ) {

            selectedRecurringDays =
              selectedRecurringDays.filter(
                value =>
                  value !== day
              );

            button.classList.remove(
              "active",
              "selected"
            );

          }

          else {

            selectedRecurringDays.push(
              day
            );

            selectedRecurringDays.sort();

            button.classList.add(
              "active",
              "selected"
            );

          }

          updateAddReservationSummary();

        }
      );

    });

}


// ==========================================================
// 16. 반복 날짜 생성
// ==========================================================

function generateRecurringDates(
  startDateString,
  selectedDays,
  months
) {

  if (
    !startDateString ||
    !selectedDays.length
  ) {

    return [];

  }

  const start =
    new Date(
      `${startDateString}T00:00:00`
    );

  const end =
    new Date(start);

  end.setMonth(
    end.getMonth() + Number(months)
  );

  const result = [];

  const current =
    new Date(start);

  while (
    current < end
  ) {

    if (
      selectedDays.includes(
        current.getDay()
      )
    ) {

      result.push(
        dateToString(current)
      );

    }

    current.setDate(
      current.getDate() + 1
    );

  }

  return result;

}


// ==========================================================
// 17. 예약 요약
// ==========================================================

function updateAddReservationSummary() {

  const summary =
    $("adminReservationSummaryText");

  if (!summary) return;

  const center =
    $("addCenter")
      ? $("addCenter").value
      : "";

  const room =
    $("addRoom")
      ? $("addRoom").value
      : "";

  const type =
    getReservationType();

  const startTime =
    $("addStartTime")
      ? $("addStartTime").value
      : "";

  const endTime =
    $("addEndTime")
      ? $("addEndTime").value
      : "";

  if (!center || !room) {

    summary.textContent =
      "센터와 공간을 선택해주세요.";

    return;

  }

  let dateText = "";

  if (type === "single") {

    if (
      selectedAdminDates.length
    ) {

      dateText =
        selectedAdminDates
          .map(
            date =>
              `${formatDateShort(date)}(${getDayName(date)})`
          )
          .join(", ");

    }

    else {

      dateText =
        "날짜 미선택";

    }

  }

  else {

    const startDate =
      $("adminStartDate")
        ? $("adminStartDate").value
        : "";

    const months =
      $("adminRecurringMonths")
        ? $("adminRecurringMonths").value
        : "";

    const dayNames = [
      "일",
      "월",
      "화",
      "수",
      "목",
      "금",
      "토"
    ];

    const days =
      selectedRecurringDays
        .map(day => dayNames[day])
        .join(", ");

    dateText =
      startDate
        ? `${formatDateShort(startDate)}부터 ${months}개월 / ${days || "요일 미선택"}`
        : `시작 날짜 미선택 / ${months}개월 / ${days || "요일 미선택"}`;

  }

  summary.innerHTML = `
    <strong>${escapeHTML(center)}</strong>
    /
    ${escapeHTML(room)}
    <br>
    ${escapeHTML(dateText)}
    <br>
    ${startTime || "--:--"}
    ~
    ${endTime || "--:--"}
  `;

}


// ==========================================================
// 18. 입력값 변경 → 요약 업데이트
// ==========================================================

[
  "addRoom",
  "addStartTime",
  "addEndTime",
  "adminStartDate",
  "adminRecurringMonths",
  "addPeople",
  "addUserName",
  "addDepartment",
  "addRegion",
  "addPhone",
  "addPurpose"
]
.forEach(id => {

  const element =
    $(id);

  if (!element) return;

  element.addEventListener(
    "input",
    updateAddReservationSummary
  );

  element.addEventListener(
    "change",
    updateAddReservationSummary
  );

});


// ==========================================================
// 19. 예약 충돌 검사
// ==========================================================

function checkConflict(
  date,
  center,
  room,
  startTime,
  endTime
) {

  const start =
    timeToMinutes(startTime);

  const end =
    timeToMinutes(endTime);

  return reservations.some(
    item => {

      if (
        item.date !== date
      ) {
        return false;
      }

      if (
        item.center !== center
      ) {
        return false;
      }

      if (
        item.room !== room
      ) {
        return false;
      }

      const bookedStart =
        timeToMinutes(
          item.start_time
        );

      const bookedEnd =
        timeToMinutes(
          item.end_time
        );

      return (
        start < bookedEnd &&
        end > bookedStart
      );

    }
  );

}


// ==========================================================
// 20. 예약 추가 Form
// ==========================================================

if ($("addForm")) {

  $("addForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        await submitAdminReservation();

      }
    );

}


// ==========================================================
// 21. 관리자 직접 예약 저장
// ==========================================================

async function submitAdminReservation() {

  const center =
    $("addCenter").value;

  const room =
    $("addRoom").value;

  const people =
    Number(
      $("addPeople").value
    );

  const startTime =
    $("addStartTime").value;

  const endTime =
    $("addEndTime").value;

  const userName =
    $("addUserName").value.trim();

  const department =
    $("addDepartment").value.trim();

  const region =
    $("addRegion").value.trim();

  const phone =
    $("addPhone").value.trim();

  const purpose =
    $("addPurpose").value.trim();

  const type =
    getReservationType();


  // --------------------------------------------------------
  // 기본 검사
  // --------------------------------------------------------

  if (!center) {

    alert("센터를 선택해주세요.");

    return;

  }


  if (!room) {

    alert("공간을 선택해주세요.");

    return;

  }


  if (!startTime || !endTime) {

    alert(
      "시작시간과 종료시간을 선택해주세요."
    );

    return;

  }


  if (
    timeToMinutes(endTime) <=
    timeToMinutes(startTime)
  ) {

    alert(
      "종료시간은 시작시간보다 늦어야 합니다."
    );

    return;

  }


  const centerInfo =
    centers[center];


  if (
    centerInfo &&
    people > centerInfo.capacity
  ) {

    alert(
      `${center}은 최대 ${centerInfo.capacity}명까지 이용할 수 있습니다.`
    );

    return;

  }


  if (!people || people < 1) {

    alert("인원을 입력해주세요.");

    return;

  }


  if (!userName) {

    alert("예약자를 입력해주세요.");

    return;

  }


  if (!department) {

    alert("부서를 입력해주세요.");

    return;

  }


  if (!region) {

    alert("센터(지역)를 입력해주세요.");

    return;

  }


  if (!phone) {

    alert("연락처를 입력해주세요.");

    return;

  }


  if (!purpose) {

    alert("사용 목적을 입력해주세요.");

    return;

  }


  // --------------------------------------------------------
  // 날짜 생성
  // --------------------------------------------------------

  let targetDates = [];

  let isRecurring =
    type === "recurring";

  let recurringMonths = null;


  if (!isRecurring) {

    if (
      selectedAdminDates.length === 0
    ) {

      alert(
        "예약 날짜를 하나 이상 선택해주세요."
      );

      return;

    }

    targetDates =
      [...selectedAdminDates];

  }

  else {

    const startDate =
      $("adminStartDate").value;

    recurringMonths =
      Number(
        $("adminRecurringMonths").value
      );


    if (!startDate) {

      alert(
        "고정 예약 시작 날짜를 선택해주세요."
      );

      return;

    }


    if (
      selectedRecurringDays.length === 0
    ) {

      alert(
        "반복 요일을 하나 이상 선택해주세요."
      );

      return;

    }


    targetDates =
      generateRecurringDates(
        startDate,
        selectedRecurringDays,
        recurringMonths
      );


    if (
      targetDates.length === 0
    ) {

      alert(
        "생성할 예약 날짜가 없습니다."
      );

      return;

    }

  }


  // --------------------------------------------------------
  // 중복 제거
  // --------------------------------------------------------

  targetDates =
    [...new Set(targetDates)]
      .sort();


  // --------------------------------------------------------
  // 충돌 검사
  // --------------------------------------------------------

  const conflicts =
    targetDates.filter(
      date =>
        checkConflict(
          date,
          center,
          room,
          startTime,
          endTime
        )
    );


  if (
    conflicts.length > 0
  ) {

    alert(
      "이미 예약된 날짜가 있습니다.\n\n" +
      conflicts
        .map(
          date =>
            `· ${formatDate(date)} (${getDayName(date)})`
        )
        .join("\n")
    );

    return;

  }


  // --------------------------------------------------------
  // 저장 버튼 잠금
  // --------------------------------------------------------

  const submitButton =
    $("submitAddBtn");

  if (submitButton) {

    submitButton.disabled =
      true;

    submitButton.textContent =
      "저장 중...";

  }


  try {

    let recurringGroupId =
      null;


    if (isRecurring) {

      recurringGroupId =
        crypto.randomUUID();

    }


    const rows =
      targetDates.map(
        date => ({

          center:
            center,

          room:
            room,

          date:
            date,

          start_time:
            startTime,

          end_time:
            endTime,

          people:
            people,

          user_name:
            userName,

          department:
            department,

          region:
            region,

          phone:
            phone,

          purpose:
            purpose,

          is_recurring:
            isRecurring,

          recurring_months:
            isRecurring
              ? recurringMonths
              : null,

          recurring_group_id:
            recurringGroupId

        })
      );


    const {
      error
    } =
      await supabaseClient
        .from("Reservations")
        .insert(rows);


    if (error) {

      console.error(
        "예약 저장 오류:",
        error
      );

      alert(
        "예약 저장에 실패했습니다.\n\n" +
        error.message
      );

      return;

    }


    alert(
      `예약이 추가되었습니다.\n\n` +
      `총 ${targetDates.length}건`
    );


    closeAddModal();

    resetAddForm();

    await loadAllReservations();

  }

  catch (error) {

    console.error(
      error
    );

    alert(
      "예약 처리 중 오류가 발생했습니다.\n\n" +
      error.message
    );

  }

  finally {

    if (submitButton) {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "추가하기";

    }

  }

}


// ==========================================================
// 22. 예약 추가 Form 초기화
// ==========================================================

function resetAddForm() {

  if ($("addForm")) {

    $("addForm").reset();

  }


  selectedAdminDates = [];

  selectedRecurringDays = [];


  if ($("selectedDates")) {

    $("selectedDates").innerHTML =
      `<span class="selected-date-empty">
        선택된 날짜가 없습니다.
      </span>`;

  }


  if ($("adminRecurringDays")) {

    $("adminRecurringDays")
      .querySelectorAll(
        "button[data-day]"
      )
      .forEach(button => {

        button.classList.remove(
          "active",
          "selected"
        );

      });

  }


  if ($("recurringOptions")) {

    $("recurringOptions").style.display =
      "none";

  }


  if ($("singleDateGroup")) {

    $("singleDateGroup").style.display =
      "block";

  }


  const singleRadio =
    document.querySelector(
      'input[name="adminReservationType"][value="single"]'
    );

  if (singleRadio) {

    singleRadio.checked =
      true;

  }


  populateRoomSelect(
    $("addRoom"),
    "",
    false
  );

  populateAddTimeOptions();

  updateAddReservationSummary();

}


// ==========================================================
// 23. 전체 예약 불러오기
// ==========================================================

async function loadAllReservations() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("Reservations")
      .select("*")
      .order(
        "date",
        {
          ascending: true
        }
      )
      .order(
        "start_time",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "예약 데이터 조회 오류:",
      error
    );

    alert(
      "예약 데이터를 불러오지 못했습니다.\n\n" +
      error.message
    );

    return;

  }


  reservations =
    data || [];


  applyFilters();

  updateDashboardStats();

  renderTodayReservations();

  renderCenterCards();

  renderCenterReservationList();

  renderWeeklyCalendar();

  renderStats();

}


// ==========================================================
// 24. 필터 적용
// ==========================================================

function applyFilters() {

  const date =
    $("filterDate")
      ? $("filterDate").value
      : "";

  const center =
    $("filterCenter")
      ? $("filterCenter").value
      : "";

  const room =
    $("filterRoom")
      ? $("filterRoom").value
      : "";

  const name =
    $("filterName")
      ? $("filterName").value
        .trim()
        .toLowerCase()
      : "";

  const purpose =
    $("filterPurpose")
      ? $("filterPurpose").value
        .trim()
        .toLowerCase()
      : "";


  filteredReservations =
    reservations.filter(item => {

      if (
        date &&
        item.date !== date
      ) {

        return false;

      }


      if (
        center &&
        item.center !== center
      ) {

        return false;

      }


      if (
        room &&
        item.room !== room
      ) {

        return false;

      }


      if (
        name &&
        !String(
          item.user_name || ""
        )
        .toLowerCase()
        .includes(name)
      ) {

        return false;

      }


      if (
        purpose &&
        !String(
          item.purpose || ""
        )
        .toLowerCase()
        .includes(purpose)
      ) {

        return false;

      }


      return true;

    });


  currentPage = 1;

  renderReservationTable();

}


// ==========================================================
// 25. 검색
// ==========================================================

if ($("searchBtn")) {

  $("searchBtn")
    .addEventListener(
      "click",
      applyFilters
    );

}


// ==========================================================
// 26. 초기화
// ==========================================================

if ($("resetBtn")) {

  $("resetBtn")
    .addEventListener(
      "click",
      () => {

        if ($("filterDate"))
          $("filterDate").value = "";

        if ($("filterCenter"))
          $("filterCenter").value = "";

        if ($("filterRoom"))
          populateRoomSelect(
            $("filterRoom"),
            "",
            true
          );

        if ($("filterName"))
          $("filterName").value = "";

        if ($("filterPurpose"))
          $("filterPurpose").value = "";

        applyFilters();

      }
    );

}


// ==========================================================
// 27. 새로고침
// ==========================================================

if ($("refreshBtn")) {

  $("refreshBtn")
    .addEventListener(
      "click",
      loadAllReservations
    );

}


// ==========================================================
// 28. 페이지 크기
// ==========================================================

if ($("pageSizeSelect")) {

  $("pageSizeSelect")
    .addEventListener(
      "change",
      () => {

        pageSize =
          Number(
            $("pageSizeSelect").value
          ) || 10;

        currentPage = 1;

        renderReservationTable();

      }
    );

}


// ==========================================================
// 29. 예약 목록 테이블
// ==========================================================

function renderReservationTable() {

  const tbody =
    $("tableBody");

  if (!tbody) return;


  const total =
    filteredReservations.length;


  if ($("listTitle")) {

    $("listTitle").textContent =
      `예약 목록 (총 ${total}건)`;

  }


  if (total === 0) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="12"
          style="text-align:center;padding:40px;"
        >
          예약이 없습니다.
        </td>
      </tr>
    `;

    renderPagination(0);

    return;

  }


  const start =
    (currentPage - 1) *
    pageSize;

  const end =
    start + pageSize;


  const pageItems =
    filteredReservations.slice(
      start,
      end
    );


  tbody.innerHTML =
    pageItems
      .map(
        (item, index) => `

          <tr>

            <td>
              ${start + index + 1}
            </td>

            <td>
              ${escapeHTML(
                item.date
              )}
              <br>
              <small>
                ${getDayName(item.date)}
              </small>
            </td>

            <td>
              ${escapeHTML(
                item.start_time
              )}
              ~
              ${escapeHTML(
                item.end_time
              )}
            </td>

            <td>
              ${escapeHTML(
                item.center
              )}
            </td>

            <td>
              ${escapeHTML(
                item.room
              )}
            </td>

            <td>
              ${escapeHTML(
                item.people
              )}명
            </td>

            <td>
              ${escapeHTML(
                item.user_name
              )}
            </td>

            <td>
              ${escapeHTML(
                item.department
              )}
            </td>

            <td>
              ${escapeHTML(
                item.phone
              )}
            </td>

            <td>
              ${escapeHTML(
                item.purpose
              )}
            </td>

            <td>
              ${formatDateTime(
                item.created_at
              )}
            </td>

            <td>

              <button
                type="button"
                class="table-action-btn"
                data-action="detail"
                data-id="${item.id}"
              >
                상세
              </button>

              <button
                type="button"
                class="table-action-btn danger"
                data-action="delete"
                data-id="${item.id}"
              >
                삭제
              </button>

            </td>

          </tr>

        `
      )
      .join("");


  tbody
    .querySelectorAll(
      "[data-action='detail']"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          openDetailModal(
            button.dataset.id
          )
      );

    });


  tbody
    .querySelectorAll(
      "[data-action='delete']"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteReservation(
            button.dataset.id
          )
      );

    });


  renderPagination(total);

}


// ==========================================================
// 30. 페이지네이션
// ==========================================================

function renderPagination(total) {

  const pagination =
    $("pagination");

  if (!pagination) return;

  const totalPages =
    Math.ceil(
      total / pageSize
    );


  if (
    totalPages <= 1
  ) {

    pagination.innerHTML = "";

    return;

  }


  let html = "";


  html += `
    <button
      type="button"
      data-page="prev"
      ${currentPage === 1 ? "disabled" : ""}
    >
      ‹
    </button>
  `;


  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {

    if (
      page <= 3 ||
      page > totalPages - 2 ||
      Math.abs(page - currentPage) <= 1
    ) {

      html += `
        <button
          type="button"
          data-page="${page}"
          class="${page === currentPage ? "active" : ""}"
        >
          ${page}
        </button>
      `;

    }

  }


  html += `
    <button
      type="button"
      data-page="next"
      ${currentPage === totalPages ? "disabled" : ""}
    >
      ›
    </button>
  `;


  pagination.innerHTML =
    html;


  pagination
    .querySelectorAll(
      "button[data-page]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const value =
            button.dataset.page;

          if (value === "prev") {

            if (
              currentPage > 1
            ) {

              currentPage--;

            }

          }

          else if (
            value === "next"
          ) {

            if (
              currentPage < totalPages
            ) {

              currentPage++;

            }

          }

          else {

            currentPage =
              Number(value);

          }

          renderReservationTable();

        }
      );

    });

}


// ==========================================================
// 31. 상세 모달
// ==========================================================

function openDetailModal(id) {

  const item =
    reservations.find(
      reservation =>
        String(
          reservation.id
        ) ===
        String(id)
    );

  if (!item) return;


  const body =
    $("modalBody");

  if (!body) return;


  body.innerHTML = `

    <div class="detail-grid">

      <div>
        <strong>날짜</strong>
        <span>
          ${escapeHTML(
            formatDate(item.date)
          )}
        </span>
      </div>

      <div>
        <strong>시간</strong>
        <span>
          ${escapeHTML(item.start_time)}
          ~
          ${escapeHTML(item.end_time)}
        </span>
      </div>

      <div>
        <strong>센터</strong>
        <span>
          ${escapeHTML(item.center)}
        </span>
      </div>

      <div>
        <strong>공간</strong>
        <span>
          ${escapeHTML(item.room)}
        </span>
      </div>

      <div>
        <strong>인원</strong>
        <span>
          ${escapeHTML(item.people)}명
        </span>
      </div>

      <div>
        <strong>예약 유형</strong>
        <span>
          ${
            item.is_recurring
              ? `고정 (${item.recurring_months || "-"}개월)`
              : "일회성"
          }
        </span>
      </div>

      <div>
        <strong>예약자</strong>
        <span>
          ${escapeHTML(item.user_name)}
        </span>
      </div>

      <div>
        <strong>부서</strong>
        <span>
          ${escapeHTML(item.department)}
        </span>
      </div>

      <div>
        <strong>센터(지역)</strong>
        <span>
          ${escapeHTML(item.region)}
        </span>
      </div>

      <div>
        <strong>연락처</strong>
        <span>
          ${escapeHTML(item.phone)}
        </span>
      </div>

      <div class="detail-full">
        <strong>목적</strong>
        <span>
          ${escapeHTML(item.purpose)}
        </span>
      </div>

    </div>

  `;


  const modal =
    $("detailModal");

  if (modal) {

    modal.classList.add(
      "active"
    );

  }

}


if ($("closeModal")) {

  $("closeModal")
    .addEventListener(
      "click",
      () => {

        $("detailModal")
          .classList.remove(
            "active"
          );

      }
    );

}


if ($("detailModal")) {

  $("detailModal")
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("detailModal")
        ) {

          $("detailModal")
            .classList.remove(
              "active"
            );

        }

      }
    );

}


// ==========================================================
// 32. 예약 삭제
// ==========================================================

async function deleteReservation(id) {

  const item =
    reservations.find(
      reservation =>
        String(
          reservation.id
        ) ===
        String(id)
    );

  if (!item) return;


  const confirmed =
    confirm(
      `${formatDate(item.date)} ${item.start_time} 예약을 삭제할까요?`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("Reservations")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(
      error
    );

    alert(
      "예약 삭제에 실패했습니다.\n\n" +
      error.message
    );

    return;

  }


  alert(
    "예약이 삭제되었습니다."
  );


  await loadAllReservations();

}


// ==========================================================
// 33. 오늘 예약
// ==========================================================

function renderTodayReservations() {

  const tbody =
    $("todayTableBody");

  if (!tbody) return;


  const today =
    getTodayString();


  const todayItems =
    reservations
      .filter(
        item =>
          item.date === today
      )
      .sort(
        (a, b) =>
          String(a.start_time)
            .localeCompare(
              String(b.start_time)
            )
      );


  if ($("todayDateLabel")) {

    $("todayDateLabel").textContent =
      formatDate(today);

  }


  if (!todayItems.length) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="10"
          style="text-align:center;padding:40px;"
        >
          오늘 예약이 없습니다.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    todayItems
      .map(
        (item, index) => `

          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHTML(item.start_time)}
              ~
              ${escapeHTML(item.end_time)}
            </td>

            <td>
              ${escapeHTML(item.center)}
            </td>

            <td>
              ${escapeHTML(item.room)}
            </td>

            <td>
              ${escapeHTML(item.people)}명
            </td>

            <td>
              ${escapeHTML(item.user_name)}
            </td>

            <td>
              ${escapeHTML(item.department)}
            </td>

            <td>
              ${escapeHTML(item.phone)}
            </td>

            <td>
              ${escapeHTML(item.purpose)}
            </td>

            <td>
              <button
                type="button"
                class="table-action-btn danger"
                data-today-delete="${item.id}"
              >
                삭제
              </button>
            </td>

          </tr>

        `
      )
      .join("");


  tbody
    .querySelectorAll(
      "[data-today-delete]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () =>
          deleteReservation(
            button.dataset.todayDelete
          )
      );

    });

}


// ==========================================================
// 34. 센터별 카드
// ==========================================================

function renderCenterCards() {

  const container =
    $("centerCards");

  if (!container) return;


  container.innerHTML =
    Object.keys(centers)
      .map(center => {

        const count =
          reservations.filter(
            item =>
              item.center === center
          ).length;

        return `

          <button
            type="button"
            class="center-summary-card"
            data-center-card="${escapeHTML(center)}"
          >

            <strong>
              ${escapeHTML(center)}
            </strong>

            <span>
              ${count}건
            </span>

          </button>

        `;

      })
      .join("");


  container
    .querySelectorAll(
      "[data-center-card]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          renderCenterReservationList(
            button.dataset.centerCard
          );

        }
      );

    });

}


// ==========================================================
// 35. 센터별 예약 목록
// ==========================================================

function renderCenterReservationList(
  selectedCenter = ""
) {

  const tbody =
    $("centerTableBody");

  if (!tbody) return;


  const list =
    reservations
      .filter(
        item =>
          !selectedCenter ||
          item.center === selectedCenter
      )
      .sort(
        (a, b) =>
          `${a.date} ${a.start_time}`
            .localeCompare(
              `${b.date} ${b.start_time}`
            )
      );


  if ($("centerListTitle")) {

    $("centerListTitle").textContent =
      selectedCenter
        ? `${selectedCenter} 예약`
        : "전체 센터";

  }


  if (!list.length) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="9"
          style="text-align:center;padding:40px;"
        >
          예약이 없습니다.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    list
      .map(
        (item, index) => `

          <tr>

            <td>${index + 1}</td>

            <td>
              ${escapeHTML(item.date)}
              (${getDayName(item.date)})
            </td>

            <td>
              ${escapeHTML(item.start_time)}
              ~
              ${escapeHTML(item.end_time)}
            </td>

            <td>
              ${escapeHTML(item.center)}
            </td>

            <td>
              ${escapeHTML(item.room)}
            </td>

            <td>
              ${escapeHTML(item.people)}명
            </td>

            <td>
              ${escapeHTML(item.user_name)}
            </td>

            <td>
              ${escapeHTML(item.phone)}
            </td>

            <td>
              ${escapeHTML(item.purpose)}
            </td>

          </tr>

        `
      )
      .join("");

}


// ==========================================================
// 36. 주간 달력
// ==========================================================

let weeklyBaseDate =
  new Date();


function renderWeeklyCalendar() {

  const container =
    $("weeklyAdminCalendar");

  if (!container) return;


  const start =
    getStartOfWeek(
      weeklyBaseDate
    );

  const end =
    getEndOfWeek(
      weeklyBaseDate
    );


  if ($("weeklyAdminRange")) {

    $("weeklyAdminRange").textContent =
      `${dateToString(start)} ~ ${dateToString(end)}`;

  }


  const center =
    $("weeklyFilterCenter")
      ? $("weeklyFilterCenter").value
      : "";

  const room =
    $("weeklyFilterRoom")
      ? $("weeklyFilterRoom").value
      : "";


  let html = `

    <div class="weekly-grid">

  `;


  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const date =
      new Date(start);

    date.setDate(
      date.getDate() + i
    );

    const dateString =
      dateToString(date);


    const items =
      reservations
        .filter(item => {

          if (
            item.date !==
            dateString
          ) {

            return false;

          }


          if (
            center &&
            item.center !== center
          ) {

            return false;

          }


          if (
            room &&
            item.room !== room
          ) {

            return false;

          }


          return true;

        })
        .sort(
          (a, b) =>
            a.start_time
              .localeCompare(
                b.start_time
              )
        );


    html += `

      <div class="weekly-day">

        <div class="weekly-day-header">

          <strong>
            ${getDayName(dateString)}
          </strong>

          <span>
            ${formatDateShort(dateString)}
          </span>

        </div>

        <div class="weekly-day-body">

          ${
            items.length
              ? items
                  .map(
                    item => `

                      <div class="weekly-reservation">

                        <strong>
                          ${escapeHTML(item.start_time)}
                          ~
                          ${escapeHTML(item.end_time)}
                        </strong>

                        <span>
                          ${escapeHTML(item.center)}
                        </span>

                        <span>
                          ${escapeHTML(item.room)}
                        </span>

                        <small>
                          ${escapeHTML(item.user_name)}
                        </small>

                      </div>

                    `
                  )
                  .join("")
              : `
                <div class="weekly-empty">
                  예약 없음
                </div>
              `
          }

        </div>

      </div>

    `;

  }


  html += `
    </div>
  `;


  container.innerHTML =
    html;

}


if ($("weeklyPrev")) {

  $("weeklyPrev")
    .addEventListener(
      "click",
      () => {

        weeklyBaseDate.setDate(
          weeklyBaseDate.getDate() - 7
        );

        renderWeeklyCalendar();

      }
    );

}


if ($("weeklyNext")) {

  $("weeklyNext")
    .addEventListener(
      "click",
      () => {

        weeklyBaseDate.setDate(
          weeklyBaseDate.getDate() + 7
        );

        renderWeeklyCalendar();

      }
    );

}


if ($("weeklyThisWeek")) {

  $("weeklyThisWeek")
    .addEventListener(
      "click",
      () => {

        weeklyBaseDate =
          new Date();

        renderWeeklyCalendar();

      }
    );

}


// ==========================================================
// 37. 대시보드 통계
// ==========================================================

function updateDashboardStats() {

  const today =
    getTodayString();


  const todayCount =
    reservations.filter(
      item =>
        item.date === today
    ).length;


  const weekStart =
    getStartOfWeek(
      new Date()
    );

  const weekEnd =
    getEndOfWeek(
      new Date()
    );


  const weekStartString =
    dateToString(weekStart);

  const weekEndString =
    dateToString(weekEnd);


  const weekCount =
    reservations.filter(
      item =>
        item.date >=
          weekStartString &&
        item.date <=
          weekEndString
    ).length;


  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const monthPrefix =
    `${year}-${month}`;


  const monthCount =
    reservations.filter(
      item =>
        String(
          item.date
        ).startsWith(
          monthPrefix
        )
    ).length;


  if ($("statToday")) {

    $("statToday").textContent =
      `${todayCount}건`;

  }


  if ($("statTodayDate")) {

    $("statTodayDate").textContent =
      formatDate(today);

  }


  if ($("statWeek")) {

    $("statWeek").textContent =
      `${weekCount}건`;

  }


  if ($("statWeekRange")) {

    $("statWeekRange").textContent =
      `${formatDateShort(
        weekStartString
      )} ~ ${formatDateShort(
        weekEndString
      )}`;

  }


  if ($("statMonth")) {

    $("statMonth").textContent =
      `${monthCount}건`;

  }


  if ($("statMonthLabel")) {

    $("statMonthLabel").textContent =
      `${year}년 ${Number(month)}월`;

  }


  if ($("statTotal")) {

    $("statTotal").textContent =
      `${reservations.length}건`;

  }

}


// ==========================================================
// 38. 통계
// ==========================================================

function renderStats() {

  const statsCards =
    $("statsCards");

  if (!statsCards) return;


  const total =
    reservations.length;


  const recurringCount =
    reservations.filter(
      item =>
        item.is_recurring
    ).length;


  const singleCount =
    total -
    recurringCount;


  const peopleTotal =
    reservations.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.people || 0
        ),
      0
    );


  statsCards.innerHTML = `

    <div class="summary-card">

      <div class="summary-icon blue">
        📅
      </div>

      <div>

        <span>전체 예약</span>

        <strong>
          ${total}건
        </strong>

      </div>

    </div>


    <div class="summary-card">

      <div class="summary-icon green">
        🔁
      </div>

      <div>

        <span>고정 예약</span>

        <strong>
          ${recurringCount}건
        </strong>

      </div>

    </div>


    <div class="summary-card">

      <div class="summary-icon purple">
        1
      </div>

      <div>

        <span>일회성 예약</span>

        <strong>
          ${singleCount}건
        </strong>

      </div>

    </div>


    <div class="summary-card">

      <div class="summary-icon orange">
        👥
      </div>

      <div>

        <span>총 이용 인원</span>

        <strong>
          ${peopleTotal}명
        </strong>

      </div>

    </div>

  `;


  renderCenterChart();

  renderRoomTypeChart();

}


// ==========================================================
// 39. 센터별 차트
// ==========================================================

function renderCenterChart() {

  const container =
    $("centerBarChart");

  if (!container) return;


  const total =
    reservations.length;


  container.innerHTML =
    Object.keys(centers)
      .map(center => {

        const count =
          reservations.filter(
            item =>
              item.center === center
          ).length;


        const percent =
          total
            ? Math.round(
                count /
                total *
                100
              )
            : 0;


        return `

          <div class="bar-row">

            <div class="bar-label">
              ${escapeHTML(center)}
            </div>

            <div class="bar-track">

              <div
                class="bar-fill"
                style="width:${percent}%"
              ></div>

            </div>

            <strong>
              ${count}건
            </strong>

          </div>

        `;

      })
      .join("");

}


// ==========================================================
// 40. 공간 유형 차트
// ==========================================================

function renderRoomTypeChart() {

  const container =
    $("roomTypeBarChart");

  if (!container) return;


  const total =
    reservations.length;


  const lecture =
    reservations.filter(
      item =>
        String(
          item.room || ""
        ).includes("강의실")
    ).length;


  const counseling =
    reservations.filter(
      item =>
        String(
          item.room || ""
        ).includes("상담실")
    ).length;


  const other =
    total -
    lecture -
    counseling;


  const data = [

    {
      name: "강의실",
      count: lecture
    },

    {
      name: "상담실",
      count: counseling
    },

    {
      name: "기타",
      count: other
    }

  ];


  container.innerHTML =
    data
      .map(item => {

        const percent =
          total
            ? Math.round(
                item.count /
                total *
                100
              )
            : 0;


        return `

          <div class="bar-row">

            <div class="bar-label">
              ${item.name}
            </div>

            <div class="bar-track">

              <div
                class="bar-fill"
                style="width:${percent}%"
              ></div>

            </div>

            <strong>
              ${item.count}건
            </strong>

          </div>

        `;

      })
      .join("");

}


// ==========================================================
// 41. 네비게이션
// ==========================================================

document
  .querySelectorAll(
    ".nav-item"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const view =
          button.dataset.view;

        switchView(view);

      }
    );

  });


function switchView(view) {

  currentView =
    view;


  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.view === view
      );

    });


  document
    .querySelectorAll(
      ".admin-view"
    )
    .forEach(section => {

      section.classList.toggle(
        "active",
        section.id ===
          `view-${view}`
      );

    });


  if (view === "dashboard") {

    applyFilters();

  }


  if (view === "today") {

    renderTodayReservations();

  }


  if (view === "byCenter") {

    renderCenterCards();

    renderCenterReservationList();

  }


  if (view === "weekly") {

    renderWeeklyCalendar();

  }


  if (view === "stats") {

    renderStats();

  }

}


// ==========================================================
// 42. 엑셀 다운로드
// ==========================================================

if ($("exportBtn")) {

  $("exportBtn")
    .addEventListener(
      "click",
      exportReservations
    );

}


function exportReservations() {

  const data =
    filteredReservations.length
      ? filteredReservations
      : reservations;


  if (!data.length) {

    alert(
      "다운로드할 예약 데이터가 없습니다."
    );

    return;

  }


  const headers = [

    "번호",
    "날짜",
    "요일",
    "시작시간",
    "종료시간",
    "센터",
    "공간",
    "인원",
    "예약자",
    "부서",
    "센터(지역)",
    "연락처",
    "목적",
    "예약유형",
    "고정기간"

  ];


  const rows =
    data.map(
      (item, index) => [

        index + 1,

        item.date,

        getDayName(item.date),

        item.start_time,

        item.end_time,

        item.center,

        item.room,

        item.people,

        item.user_name,

        item.department,

        item.region,

        item.phone,

        item.purpose,

        item.is_recurring
          ? "고정"
          : "일회성",

        item.recurring_months || ""

      ]
    );


  const csvRows = [

    headers,

    ...rows

  ];


  const csv =
    csvRows
      .map(row =>
        row
          .map(value =>
            `"${String(
              value ?? ""
            ).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [
        "\uFEFF" +
        csv
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");

  link.href =
    url;

  link.download =
    `예약목록_${getTodayString()}.csv`;

  link.click();


  URL.revokeObjectURL(url);

}


// ==========================================================
// 43. ESC로 모달 닫기
// ==========================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !== "Escape"
    ) {
      return;
    }


    if ($("addModal")) {

      $("addModal")
        .classList.remove(
          "active"
        );

    }


    if ($("detailModal")) {

      $("detailModal")
        .classList.remove(
          "active"
        );

    }

  }
);


// ==========================================================
// 44. 초기화
// ==========================================================

async function initAdmin() {

  console.log(
    "관리자 페이지 초기화 시작"
  );


  // 센터 목록
  populateCenterSelects();


  // 필터 공간
  populateRoomSelect(
    $("filterRoom"),
    "",
    true
  );


  populateRoomSelect(
    $("weeklyFilterRoom"),
    "",
    true
  );


  // 예약 추가 공간
  populateRoomSelect(
    $("addRoom"),
    "",
    false
  );


  // 시간
  populateAddTimeOptions();


  // 예약 유형
  updateReservationTypeUI();


  // 날짜
  renderSelectedDates();


  // 데이터
  await loadAllReservations();


  console.log(
    "관리자 페이지 초기화 완료"
  );

}


initAdmin();
