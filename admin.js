// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL =
  "https://ohnxhlbwzakwzhzhkhvt.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_v8DnBpF4GX4oABnGOfpRxA_QH6ruB5Q";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


// ==========================================
// 센터
// ==========================================

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


// ==========================================
// 공간
// ==========================================

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


// ==========================================
// 예약 데이터
// ==========================================

const reservation = {

  center: "",
  room: "",

  dates: [],

  startTime: "",
  endTime: "",

  people: 1,

  department: "",
  region: "",
  userName: "",
  phone: "",
  purpose: "",

  isRecurring: false,
  recurringMonths: 1,

  recurringGroupId: ""

};


// ==========================================
// 관리자 예약 데이터
// ==========================================

let reservations = [];


// ==========================================
// 시간 함수
// ==========================================

function timeToMinutes(time) {

  if (!time) return 0;

  const [
    hour,
    minute
  ] = time.split(":").map(Number);

  return hour * 60 + minute;

}


function minutesToTime(minutes) {

  if (minutes >= 1440) {
    return "24:00";
  }

  let hour =
    Math.floor(minutes / 60);

  const minute =
    minutes % 60;

  return (
    String(hour).padStart(2, "0") +
    ":" +
    String(minute).padStart(2, "0")
  );

}


function addMinutes(
  time,
  amount
) {

  return minutesToTime(
    timeToMinutes(time) + amount
  );

}


// ==========================================
// 날짜 함수
// ==========================================

function dateToString(date) {

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function formatDate(dateString) {

  if (!dateString) {
    return "";
  }

  const [
    year,
    month,
    day
  ] = dateString.split("-");

  return (
    `${year}년 ` +
    `${Number(month)}월 ` +
    `${Number(day)}일`
  );

}


// ==========================================
// HTML escape
// ==========================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==========================================
// DOM
// ==========================================

const centerSelect =
  document.getElementById(
    "adminCenter"
  );

const roomSelect =
  document.getElementById(
    "adminRoom"
  );

const dateInput =
  document.getElementById(
    "adminDate"
  );

const calendarDays =
  document.getElementById(
    "adminCalendarDays"
  );

const monthTitle =
  document.getElementById(
    "adminMonthTitle"
  );

const startTimeSelect =
  document.getElementById(
    "adminStartTime"
  );

const endTimeSelect =
  document.getElementById(
    "adminEndTime"
  );

const peopleInput =
  document.getElementById(
    "adminPeople"
  );

const departmentInput =
  document.getElementById(
    "adminDepartment"
  );

const regionInput =
  document.getElementById(
    "adminRegion"
  );

const nameInput =
  document.getElementById(
    "adminUserName"
  );

const phoneInput =
  document.getElementById(
    "adminPhone"
  );

const purposeInput =
  document.getElementById(
    "adminPurpose"
  );

const recurringMonths =
  document.getElementById(
    "adminRecurringMonths"
  );

const reservationTypeInputs =
  document.querySelectorAll(
    'input[name="adminReservationType"]'
  );

const recurringOptions =
  document.getElementById(
    "adminRecurringOptions"
  );

const selectedDatesBox =
  document.getElementById(
    "adminSelectedDates"
  );

const reserveButton =
  document.getElementById(
    "adminReserveButton"
  );


// ==========================================
// 캘린더 상태
// ==========================================

let adminCurrentDate =
  new Date();


// ==========================================
// 센터 선택
// ==========================================

if (centerSelect) {

  centerSelect.addEventListener(
    "change",
    async () => {

      reservation.center =
        centerSelect.value;

      reservation.room = "";

      reservation.dates = [];

      reservation.startTime = "";
      reservation.endTime = "";

      renderRooms();

      renderCalendar();

      updateSelectedDates();

      updateTimeOptions();

      await loadReservations();

      validateAdminReservation();

    }
  );

}


// ==========================================
// 공간 선택
// ==========================================

if (roomSelect) {

  roomSelect.addEventListener(
    "change",
    async () => {

      reservation.room =
        roomSelect.value;

      reservation.dates = [];

      renderCalendar();

      updateSelectedDates();

      await loadReservations();

      validateAdminReservation();

    }
  );

}


// ==========================================
// 공간 렌더링
// ==========================================

function renderRooms() {

  if (!roomSelect) {
    return;
  }

  roomSelect.innerHTML =
    `<option value="">공간 선택</option>`;

  const rooms =
    roomsByCenter[
      reservation.center
    ] || [];

  rooms.forEach(room => {

    const option =
      document.createElement(
        "option"
      );

    option.value = room;
    option.textContent = room;

    roomSelect.appendChild(
      option
    );

  });

}


// ==========================================
// 시간 옵션
// ==========================================

function updateTimeOptions() {

  if (!startTimeSelect) {
    return;
  }

  startTimeSelect.innerHTML =
    `<option value="">시작시간</option>`;

  endTimeSelect.innerHTML =
    `<option value="">종료시간</option>`;

  if (!reservation.center) {
    return;
  }

  const center =
    centers[
      reservation.center
    ];

  const open =
    timeToMinutes(
      center.open
    );

  const close =
    timeToMinutes(
      center.close
    );

  for (
    let minute = open;
    minute <= close;
    minute += 30
  ) {

    const time =
      minutesToTime(
        minute
      );

    const option =
      document.createElement(
        "option"
      );

    option.value = time;
    option.textContent = time;

    startTimeSelect.appendChild(
      option
    );

  }

  for (
    let minute = open + 30;
    minute <= close;
    minute += 30
  ) {

    const time =
      minutesToTime(
        minute
      );

    const option =
      document.createElement(
        "option"
      );

    option.value = time;
    option.textContent = time;

    endTimeSelect.appendChild(
      option
    );

  }

}


// ==========================================
// 시작 시간
// ==========================================

if (startTimeSelect) {

  startTimeSelect.addEventListener(
    "change",
    () => {

      reservation.startTime =
        startTimeSelect.value;

      reservation.endTime = "";

      if (endTimeSelect) {
        endTimeSelect.value = "";
      }

      validateAdminReservation();

    }
  );

}


// ==========================================
// 종료 시간
// ==========================================

if (endTimeSelect) {

  endTimeSelect.addEventListener(
    "change",
    () => {

      reservation.endTime =
        endTimeSelect.value;

      validateAdminReservation();

    }
  );

}


// ==========================================
// 예약 유형
// ==========================================

reservationTypeInputs.forEach(
  input => {

    input.addEventListener(
      "change",
      () => {

        reservation.isRecurring =
          input.value === "recurring";

        if (recurringOptions) {

          recurringOptions.style.display =
            reservation.isRecurring
              ? "block"
              : "none";

        }

        validateAdminReservation();

      }
    );

  }
);


// ==========================================
// 반복 개월
// ==========================================

if (recurringMonths) {

  recurringMonths.addEventListener(
    "change",
    () => {

      reservation.recurringMonths =
        Number(
          recurringMonths.value
        ) || 1;

      validateAdminReservation();

    }
  );

}


// ==========================================
// 캘린더
// ==========================================

function renderCalendar() {

  if (!calendarDays) {
    return;
  }

  calendarDays.innerHTML = "";

  const year =
    adminCurrentDate.getFullYear();

  const month =
    adminCurrentDate.getMonth();

  if (monthTitle) {

    monthTitle.textContent =
      `${year}.${String(month + 1).padStart(2, "0")}`;

  }

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const lastDate =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "admin-calendar-empty";

    calendarDays.appendChild(
      empty
    );

  }


  const today =
    new Date();

  const todayString =
    dateToString(today);


  for (
    let day = 1;
    day <= lastDate;
    day++
  ) {

    const date =
      new Date(
        year,
        month,
        day
      );

    const dateString =
      dateToString(date);

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.textContent =
      day;

    button.dataset.date =
      dateString;


    if (
      dateString === todayString
    ) {

      button.classList.add(
        "today"
      );

    }


    if (
      reservation.dates.includes(
        dateString
      )
    ) {

      button.classList.add(
        "selected"
      );

    }


    button.addEventListener(
      "click",
      () => {

        toggleDate(
          dateString
        );

      }
    );


    calendarDays.appendChild(
      button
    );

  }

}


// ==========================================
// 날짜 다중 선택
// ==========================================

function toggleDate(
  dateString
) {

  const index =
    reservation.dates.indexOf(
      dateString
    );


  if (index >= 0) {

    reservation.dates.splice(
      index,
      1
    );

  }

  else {

    reservation.dates.push(
      dateString
    );

  }


  reservation.dates.sort();

  renderCalendar();

  updateSelectedDates();

  validateAdminReservation();

}


// ==========================================
// 선택 날짜 표시
// ==========================================

function updateSelectedDates() {

  if (!selectedDatesBox) {
    return;
  }

  if (!reservation.dates.length) {

    selectedDatesBox.innerHTML =
      `<span>예약 날짜를 선택해주세요.</span>`;

    return;

  }


  selectedDatesBox.innerHTML =
    reservation.dates
      .map(date => {

        return `
          <button
            type="button"
            class="selected-date-chip"
            data-date="${date}"
          >
            ${formatDate(date)}
            <span>×</span>
          </button>
        `;

      })
      .join("");


  selectedDatesBox
    .querySelectorAll(
      ".selected-date-chip"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          toggleDate(
            button.dataset.date
          );

        }
      );

    });

}


// ==========================================
// 이전 달
// ==========================================

const previousMonthButton =
  document.getElementById(
    "adminPrevMonth"
  );

if (previousMonthButton) {

  previousMonthButton.addEventListener(
    "click",
    () => {

      adminCurrentDate.setMonth(
        adminCurrentDate.getMonth() - 1
      );

      renderCalendar();

    }
  );

}


// ==========================================
// 다음 달
// ==========================================

const nextMonthButton =
  document.getElementById(
    "adminNextMonth"
  );

if (nextMonthButton) {

  nextMonthButton.addEventListener(
    "click",
    () => {

      adminCurrentDate.setMonth(
        adminCurrentDate.getMonth() + 1
      );

      renderCalendar();

    }
  );

}


// ==========================================
// 오늘
// ==========================================

const todayButton =
  document.getElementById(
    "adminTodayButton"
  );

if (todayButton) {

  todayButton.addEventListener(
    "click",
    () => {

      adminCurrentDate =
        new Date();

      renderCalendar();

    }
  );

}


// ==========================================
// 인원
// ==========================================

if (peopleInput) {

  peopleInput.addEventListener(
    "change",
    () => {

      let value =
        Number(
          peopleInput.value
        );

      if (!value || value < 1) {
        value = 1;
      }

      const center =
        centers[
          reservation.center
        ];

      if (
        center &&
        value > center.capacity
      ) {

        value =
          center.capacity;

        alert(
          `${reservation.center}은 최대 ${center.capacity}명까지 이용할 수 있습니다.`
        );

      }

      reservation.people =
        value;

      peopleInput.value =
        value;

    }
  );

}


// ==========================================
// 예약 정보 입력
// ==========================================

function bindInput(
  element,
  property
) {

  if (!element) {
    return;
  }

  element.addEventListener(
    "input",
    () => {

      reservation[property] =
        element.value;

      validateAdminReservation();

    }
  );

}


bindInput(
  departmentInput,
  "department"
);

bindInput(
  regionInput,
  "region"
);

bindInput(
  nameInput,
  "userName"
);

bindInput(
  phoneInput,
  "phone"
);

bindInput(
  purposeInput,
  "purpose"
);


// ==========================================
// 예약 가능 여부
// ==========================================

function validateAdminReservation() {

  if (!reserveButton) {
    return;
  }

  const valid =

    reservation.center &&

    reservation.room &&

    reservation.dates.length > 0 &&

    reservation.startTime &&

    reservation.endTime &&

    timeToMinutes(
      reservation.endTime
    ) >
    timeToMinutes(
      reservation.startTime
    ) &&

    reservation.people > 0 &&

    reservation.department &&

    reservation.region &&

    reservation.userName &&

    reservation.phone &&

    reservation.purpose;


  reserveButton.disabled =
    !valid;

}


// ==========================================
// 예약 충돌 확인
// ==========================================

function hasConflict(
  date,
  startTime,
  endTime
) {

  const start =
    timeToMinutes(
      startTime
    );

  const end =
    timeToMinutes(
      endTime
    );


  return reservations.some(
    item => {

      if (
        item.date !== date
      ) {

        return false;

      }


      if (
        item.center !==
        reservation.center
      ) {

        return false;

      }


      if (
        item.room !==
        reservation.room
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


// ==========================================
// Supabase 예약 불러오기
// ==========================================

async function loadReservations() {

  if (
    !reservation.center ||
    !reservation.room
  ) {

    reservations = [];

    return;

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("Reservations")
      .select(`
        id,
        center,
        room,
        date,
        start_time,
        end_time,
        people,
        user_name,
        department,
        region,
        phone,
        purpose,
        is_recurring,
        recurring_months,
        recurring_group_id
      `)
      .eq(
        "center",
        reservation.center
      )
      .eq(
        "room",
        reservation.room
      );


  if (error) {

    console.error(
      "예약 조회 오류:",
      error
    );

    reservations = [];

    return;

  }


  reservations =
    data || [];

}


// ==========================================
// 여러 날짜 예약 저장
// ==========================================

if (reserveButton) {

  reserveButton.addEventListener(
    "click",
    async () => {

      if (
        !reservation.dates.length
      ) {

        alert(
          "예약 날짜를 선택해주세요."
        );

        return;

      }


      if (
        !reservation.startTime ||
        !reservation.endTime
      ) {

        alert(
          "예약 시간을 선택해주세요."
        );

        return;

      }


      if (
        timeToMinutes(
          reservation.endTime
        ) <=
        timeToMinutes(
          reservation.startTime
        )
      ) {

        alert(
          "종료시간은 시작시간보다 늦어야 합니다."
        );

        return;

      }


      // ----------------------------
      // 반복 예약 날짜 자동 생성
      // ----------------------------

      let targetDates = [];


      if (
        reservation.isRecurring
      ) {

        targetDates =
          generateRecurringDates(
            reservation.dates,
            reservation.recurringMonths
          );

      }

      else {

        targetDates =
          [...reservation.dates];

      }


      targetDates =
        [...new Set(targetDates)]
          .sort();


      // ----------------------------
      // 기존 예약 충돌 확인
      // ----------------------------

      const conflicts =
        targetDates.filter(
          date =>
            hasConflict(
              date,
              reservation.startTime,
              reservation.endTime
            )
        );


      if (
        conflicts.length
      ) {

        alert(
          "이미 예약된 날짜가 있습니다.\n\n" +
          conflicts
            .map(
              date =>
                `· ${formatDate(date)}`
            )
            .join("\n")
        );

        return;

      }


      reserveButton.disabled =
        true;

      reserveButton.textContent =
        "예약 저장 중...";


      try {

        let groupId = null;


        if (
          reservation.isRecurring
        ) {

          groupId =
            crypto.randomUUID();

        }


        const rows =
          targetDates.map(
            date => ({

              center:
                reservation.center,

              room:
                reservation.room,

              date:
                date,

              start_time:
                reservation.startTime,

              end_time:
                reservation.endTime,

              people:
                reservation.people,

              user_name:
                reservation.userName,

              department:
                reservation.department,

              region:
                reservation.region,

              phone:
                reservation.phone,

              purpose:
                reservation.purpose,

              is_recurring:
                reservation.isRecurring,

              recurring_months:
                reservation.isRecurring
                  ? reservation.recurringMonths
                  : null,

              recurring_group_id:
                groupId

            })
          );


        const {
          data,
          error
        } =
          await supabaseClient
            .from("Reservations")
            .insert(rows)
            .select();


        if (error) {

          console.error(
            "예약 저장 오류:",
            error
          );

          alert(
            "예약 저장에 실패했습니다.\n\n" +
            error.message
          );

          reserveButton.disabled =
            false;

          reserveButton.textContent =
            "예약 신청";

          return;

        }


        alert(
          `예약이 완료되었습니다.\n\n` +
          `총 ${targetDates.length}개 날짜`
        );


        // 초기화
        resetAdminReservation();


        // 예약 목록 다시 불러오기
        await loadReservations();

        renderCalendar();

        updateSelectedDates();

      }

      catch (error) {

        console.error(
          error
        );

        alert(
          "예약 처리 중 문제가 발생했습니다.\n\n" +
          error.message
        );

      }


      reserveButton.disabled =
        false;

      reserveButton.textContent =
        "예약 신청";

    }
  );

}


// ==========================================
// 반복 날짜 생성
// ==========================================

function generateRecurringDates(
  selectedDates,
  months
) {

  const result =
    [];


  const endDates =
    selectedDates.map(
      date =>
        new Date(
          `${date}T00:00:00`
        )
    );


  selectedDates.forEach(
    dateString => {

      const start =
        new Date(
          `${dateString}T00:00:00`
        );


      const end =
        new Date(start);

      end.setMonth(
        end.getMonth() + months
      );


      const targetDay =
        start.getDay();


      const current =
        new Date(start);


      while (
        current < end
      ) {

        if (
          current.getDay() ===
          targetDay
        ) {

          result.push(
            dateToString(current)
          );

        }


        current.setDate(
          current.getDate() + 1
        );

      }

    }
  );


  return result;

}


// ==========================================
// 관리자 예약 초기화
// ==========================================

function resetAdminReservation() {

  reservation.center = "";
  reservation.room = "";

  reservation.dates = [];

  reservation.startTime = "";
  reservation.endTime = "";

  reservation.people = 1;

  reservation.department = "";
  reservation.region = "";
  reservation.userName = "";
  reservation.phone = "";
  reservation.purpose = "";

  reservation.isRecurring = false;
  reservation.recurringMonths = 1;

  if (centerSelect) {
    centerSelect.value = "";
  }

  if (roomSelect) {

    roomSelect.innerHTML =
      `<option value="">공간 선택</option>`;

  }

  if (startTimeSelect) {
    startTimeSelect.value = "";
  }

  if (endTimeSelect) {
    endTimeSelect.value = "";
  }

  if (peopleInput) {
    peopleInput.value = 1;
  }

  if (departmentInput) {
    departmentInput.value = "";
  }

  if (regionInput) {
    regionInput.value = "";
  }

  if (nameInput) {
    nameInput.value = "";
  }

  if (phoneInput) {
    phoneInput.value = "";
  }

  if (purposeInput) {
    purposeInput.value = "";
  }

  if (recurringOptions) {
    recurringOptions.style.display =
      "none";
  }

  reservationTypeInputs.forEach(
    input => {
      input.checked =
        input.value === "once";
    }
  );

  renderCalendar();

  updateSelectedDates();

  updateTimeOptions();

  validateAdminReservation();

}


// ==========================================
// 관리자 예약 목록
// ==========================================

async function renderAdminReservations() {

  const list =
    document.getElementById(
      "adminReservationList"
    );

  if (!list) {
    return;
  }


  if (!reservations.length) {

    list.innerHTML =
      `<div class="admin-empty">
        예약이 없습니다.
      </div>`;

    return;

  }


  const sorted =
    [...reservations]
      .sort(
        (a, b) =>
          `${a.date} ${a.start_time}`
            .localeCompare(
              `${b.date} ${b.start_time}`
            )
      );


  list.innerHTML =
    sorted
      .map(
        item => `

          <div
            class="admin-reservation-item"
            data-id="${item.id}"
          >

            <div class="admin-reservation-main">

              <strong>
                ${escapeHTML(item.date)}
              </strong>

              <span>
                ${escapeHTML(item.start_time)}
                ~
                ${escapeHTML(item.end_time)}
              </span>

            </div>


            <div class="admin-reservation-info">

              <strong>
                ${escapeHTML(item.user_name)}
              </strong>

              <span>
                ${escapeHTML(item.department)}
              </span>

              <span>
                ${escapeHTML(item.region)}
              </span>

              <span>
                ${escapeHTML(item.phone)}
              </span>

            </div>


            <button
              type="button"
              class="admin-delete-button"
              data-id="${item.id}"
            >
              삭제
            </button>

          </div>

        `
      )
      .join("");


  list
    .querySelectorAll(
      ".admin-delete-button"
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

}


// ==========================================
// 예약 삭제
// ==========================================

async function deleteReservation(
  id
) {

  const target =
    reservations.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!target) {
    return;
  }


  const confirmDelete =
    confirm(
      `${formatDate(target.date)} 예약을 삭제할까요?`
    );


  if (!confirmDelete) {
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

    alert(
      "예약 삭제에 실패했습니다.\n\n" +
      error.message
    );

    return;

  }


  await loadReservations();

  renderAdminReservations();

  renderCalendar();

}


// ==========================================
// 초기 실행
// ==========================================

renderRooms();

updateTimeOptions();

renderCalendar();

updateSelectedDates();

validateAdminReservation();
