const SUPABASE_URL = "https://ohnxhlbwzakwzhzhkhvt.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_v8DnBpF4GX4oABnGOfpRxA_QH6ruB5Q";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ==========================================
// 센터
// ==========================================

const centers = {
  "큰 서교센터": {
    capacity: 50,
    open: "06:00",
    close: "24:00"
  },

  "작은 서교센터": {
    capacity: 55,
    open: "06:00",
    close: "24:00"
  },

  "명동센터": {
    capacity: 70,
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

  "큰 서교센터": [
    "강의실1(좌)",
    "강의실2(우)",
    "상담실1",
    "상담실2"
  ],

  "작은 서교센터": [
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
// 예약 객체
// ==========================================

const reservation = {

  center: "",
  capacity: 0,
  room: "",
  rooms: [], // 공간 다중 선택 (강의실+상담실 동시 선택용)

  date: "",
  dates: [], // 여러 날짜 선택 (일회성 예약 다중 선택용)

  startTime: "",
  endTime: "",

  people: 2,

  userName: "",
  department: "",
  region: "",
  phone: "",
  purpose: "",

  reservationPassword: "",

  // 반복 예약
  isRecurring: false,
  recurringMonths: 1,
  recurringGroupId: "",
  recurringWeekdays: [] // 고정예약 반복 요일 다중선택 (예: [2,4,5] = 화목금)

};


// ==========================================
// 페이지
// ==========================================

const reservationPage =
  document.getElementById("reservationPage");

const userPage =
  document.getElementById("userPage");

const confirmPage =
  document.getElementById("confirmPage");

const completePage =
  document.getElementById("completePage");

// 20260813 1024 modified by backboneofhys
// myReservationButton -> myReservationPage

const myReservationPage =
  document.getElementById("myReservationPage");

// end

function showPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(p => p.classList.remove("active"));

  page.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// ==========================================
// 시간 함수
// ==========================================

function timeToMinutes(time) {

  const [hour, minute] =
    time.split(":").map(Number);

  return hour * 60 + minute;

}


function minutesToTime(minutes) {

  let hour =
    Math.floor(minutes / 60);

  const minute =
    minutes % 60;

  if (hour >= 24) {
    hour = 24;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

}


function addMinutes(time, amount) {

  return minutesToTime(
    timeToMinutes(time) + amount
  );

}


function createTimeList() {

  const times = [];

  for (let hour = 0; hour < 24; hour++) {

    for (let minute = 0; minute < 60; minute += 30) {

      times.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );

    }

  }

  return times;

}


const allTimes = createTimeList();


// ==========================================
// 페이지 요소
// ==========================================

const centerOptions =
  document.querySelectorAll(".center-option");

const roomSection =
  document.getElementById("roomSection");

const roomGrid =
  document.getElementById("roomGrid");

const calendarDays =
  document.getElementById("calendarDays");

const monthTitle =
  document.getElementById("monthTitle");

const timeSlotNotice =
  document.getElementById("timeSlotNotice");

const timeSlotWrapperOuter =
  document.getElementById("timeSlotWrapperOuter");

const timeSlotWrapper =
  document.getElementById("timeSlotWrapper");

const timeSlotGrid =
  document.getElementById("timeSlotGrid");


// ==========================================
// 예약 데이터
// ==========================================

let bookedReservations = [];

let myReservations = []; // 내 예약 조회용

// ==========================================
// 센터 선택
// ==========================================

centerOptions.forEach(option => {

  option.addEventListener("click", async () => {

    centerOptions.forEach(item =>
      item.classList.remove("selected")
    );

    option.classList.add("selected");

    reservation.center =
      option.dataset.center;

    reservation.capacity =
      Number(option.dataset.capacity);

    reservation.room = "";
    reservation.rooms = [];

    reservation.startTime = "";
    reservation.endTime = "";

    document.getElementById(
      "capacityText"
    ).textContent =
      `${reservation.center}은 최대 ${reservation.capacity}명까지 이용할 수 있습니다.`;

    document.getElementById(
      "quickCenter"
    ).textContent =
      reservation.center;

    document.getElementById(
      "quickRoom"
    ).textContent =
      "선택하기";

    renderRooms();

    renderWeeklyReservation();

    renderCalendar();

    renderTimeSlots();

    updateDuration();

    updateQuickTime();

    validateReservation();

  });

});


// ==========================================
// 공간
// ==========================================

function renderRooms() {

  roomGrid.innerHTML = "";

  const rooms =
    roomsByCenter[reservation.center] || [];

  if (!rooms.length) {

    roomSection.style.display = "none";

    return;

  }

  roomSection.style.display = "block";


  rooms.forEach(room => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "room-option";

    const isLecture =
      room.startsWith("강의실");

    const iconSvg = isLecture
      ? `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
           <path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
           <path d="M7 9l3 2-3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
           <circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/>
           <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
           <circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.6"/>
           <path d="M15 20c0-2.4 1.8-4.3 4.3-4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
         </svg>`;

    button.innerHTML =
      `<span class="option-icon small">${iconSvg}</span><span class="room-option-label">${room}</span>`;


    if (reservation.rooms.includes(room)) {

      button.classList.add("selected");

    }


    button.addEventListener(
      "click",
      async () => {

        const index =
          reservation.rooms.indexOf(room);

        if (index === -1) {

          reservation.rooms.push(room);

        } else {

          reservation.rooms.splice(index, 1);

        }

        // 기존 코드와 호환을 위해 room(단일)은 첫번째 선택값으로 유지
        reservation.room =
          reservation.rooms[0] || "";

        reservation.startTime = "";
        reservation.endTime = "";

        document.getElementById(
          "quickRoom"
        ).textContent =
          reservation.rooms.length === 0
            ? "선택하기"
            : reservation.rooms.length === 1
              ? reservation.rooms[0]
              : `${reservation.rooms[0]} 외 ${reservation.rooms.length - 1}개`;

        renderRooms();

        await loadBookedReservations();

        await renderWeeklyReservation();

        renderCalendar();

        updateDuration();

        updateQuickTime();

        validateReservation();

      }
    );


    roomGrid.appendChild(button);

  });

}


// ==========================================
// 달력
// ==========================================

let currentDate = new Date();

const today = new Date();


function dateToString(date) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1).padStart(2, "0");

  const day =
    String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function renderCalendar() {

  calendarDays.innerHTML = "";

  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();

  monthTitle.textContent =
    `${year}.${String(month + 1).padStart(2, "0")}`;


  const firstDay =
    new Date(year, month, 1).getDay();

  const lastDate =
    new Date(year, month + 1, 0).getDate();


  for (let i = 0; i < firstDay; i++) {

    const empty =
      document.createElement("div");

    calendarDays.appendChild(empty);

  }


  for (let day = 1; day <= lastDate; day++) {

    const button =
      document.createElement("button");

    button.textContent = day;


    const dateObject =
      new Date(year, month, day);

    const todayOnly =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );


    const dateString =
      dateToString(dateObject);


    if (dateObject < todayOnly) {

      button.classList.add("disabled");

      calendarDays.appendChild(button);

      continue;

    }


    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    ) {

      button.classList.add("today");

    }


    if (
      reservation.dates.includes(dateString)
    ) {

      button.classList.add("selected");

    }


    // 예약 여부 점 표시
    if (
      calendarReservationDates.has(dateString)
    ) {

      button.classList.add(
        "has-reservation"
      );

    }


    button.addEventListener(
      "click",
      async () => {

        if (reservation.isRecurring) {

          // 고정 사용: 시작 날짜 하나만 선택 (클릭할 때마다 교체)
          reservation.dates = [dateString];

        } else {

          // 일회성: 여러 날짜를 토글 방식으로 선택
          const index =
            reservation.dates.indexOf(dateString);

          if (index === -1) {

            reservation.dates.push(dateString);

            reservation.dates.sort();

          } else {

            reservation.dates.splice(index, 1);

          }

        }

        reservation.date =
          reservation.dates[0] || "";

        reservation.startTime = "";
        reservation.endTime = "";

        updateSelectedDatesUI();

        renderCalendar();

        await loadBookedReservations();

        updateDuration();

        updateQuickTime();

        validateReservation();

      }
    );


    calendarDays.appendChild(button);

  }

}


// ==========================================
// 선택된 날짜 표시 (칩)
// ==========================================

function updateSelectedDatesUI() {

  const wrap =
    document.getElementById("selectedDatesChips");

  if (!wrap) return;

  wrap.innerHTML = "";

  if (reservation.dates.length === 0) {

    wrap.innerHTML =
      `<span class="chips-empty">선택된 날짜가 없습니다.</span>`;

  } else {

    reservation.dates.forEach(dateString => {

      const chip =
        document.createElement("span");

      chip.className = "selected-date-chip";

      const [y, m, d] =
        dateString.split("-");

      chip.innerHTML =
        `${Number(m)}.${Number(d)}` +
        (reservation.isRecurring
          ? ""
          : `<span data-date="${dateString}">×</span>`);

      wrap.appendChild(chip);

    });

  }


  // 빠른 요약(quickDate) 갱신
  const quickDate =
    document.getElementById("quickDate");

  if (reservation.dates.length === 0) {

    quickDate.textContent = "선택하기";

  } else if (reservation.dates.length === 1) {

    const [y, m, d] =
      reservation.dates[0].split("-");

    quickDate.textContent =
      `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;

  } else {

    const [y, m, d] =
      reservation.dates[0].split("-");

    quickDate.textContent =
      `${Number(m)}월 ${Number(d)}일 외 ${reservation.dates.length - 1}일`;

  }


  // 칩의 × 클릭하면 그 날짜만 선택 해제
  wrap.querySelectorAll("[data-date]").forEach(el => {

    el.addEventListener("click", async () => {

      const target = el.dataset.date;

      reservation.dates =
        reservation.dates.filter(d => d !== target);

      reservation.date =
        reservation.dates[0] || "";

      reservation.startTime = "";
      reservation.endTime = "";

      updateSelectedDatesUI();

      renderCalendar();

      await loadBookedReservations();

      updateDuration();

      updateQuickTime();

      validateReservation();

    });

  });

}


document.getElementById(
  "prevMonth"
).addEventListener(
  "click",
  async () => {

    currentDate.setMonth(
      currentDate.getMonth() - 1
    );

    await loadCalendarReservationDates();

    renderCalendar();

  }
);


document.getElementById(
  "nextMonth"
).addEventListener(
  "click",
  async () => {

    currentDate.setMonth(
      currentDate.getMonth() + 1
    );

    await loadCalendarReservationDates();

    renderCalendar();

  }
);


// ==========================================
// 월간 예약 날짜
// ==========================================

let calendarReservationDates =
  new Set();


async function loadCalendarReservationDates() {

  calendarReservationDates =
    new Set();


  if (
    !reservation.center ||
    !reservation.room
  ) {

    renderCalendar();

    return;

  }


  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();


  const startDate =
    `${year}-${String(month + 1).padStart(2, "0")}-01`;


  const lastDay =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const endDate =
    `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;


  const { data, error } =
    await supabaseClient
      .from("Reservations")
      .select("date")
      .eq("center", reservation.center)
      .eq("room", reservation.room)
      .gte("date", startDate)
      .lte("date", endDate);


  if (error) {

    console.error(
      "달력 예약 조회 오류:",
      error
    );

    return;

  }


  (data || []).forEach(item => {

    calendarReservationDates.add(
      item.date
    );

  });

}


// ==========================================
// 시간 슬롯
// ==========================================

function generateSlots(open, close) {

  const start =
    timeToMinutes(open);

  const end =
    timeToMinutes(close);

  const slots = [];

  for (
    let minute = start;
    minute < end;
    minute += 30
  ) {

    slots.push(
      minutesToTime(minute)
    );

  }

  return slots;

}


function isBooked(time) {

  const slotStart =
    timeToMinutes(time);

  const slotEnd =
    slotStart + 30;


  return bookedReservations.some(item => {

    const bookedStart =
      timeToMinutes(item.start_time);

    const bookedEnd =
      timeToMinutes(item.end_time);

    return (
      slotStart < bookedEnd &&
      slotEnd > bookedStart
    );

  });

}


async function loadBookedReservations() {

  if (
    !reservation.center ||
    reservation.dates.length === 0 ||
    reservation.rooms.length === 0
  ) {

    bookedReservations = [];

    renderTimeSlots();

    return;

  }


  const { data, error } =
    await supabaseClient
      .from("Reservations")
      .select(`
        start_time,
        end_time
      `)
      .eq(
        "center",
        reservation.center
      )
      .in(
        "date",
        reservation.dates
      )
      .in(
        "room",
        reservation.rooms
      );


  if (error) {

    console.error(
      "예약 시간 조회 오류:",
      error
    );

    bookedReservations = [];

    renderTimeSlots();

    return;

  }


  bookedReservations =
    data || [];

  renderTimeSlots();

}


// ==========================================
// 시간 슬롯 표시
// ==========================================

function renderTimeSlots() {

  timeSlotGrid.innerHTML = "";


  if (!reservation.center) {

    timeSlotNotice.style.display =
      "block";

    timeSlotWrapperOuter.style.display =
      "none";

    return;

  }


  timeSlotNotice.style.display =
    "none";

  timeSlotWrapperOuter.style.display =
    "flex";


  const center =
    centers[reservation.center];

  const slots =
    generateSlots(
      center.open,
      center.close
    );


  const startMinutes =
    reservation.startTime
      ? timeToMinutes(reservation.startTime)
      : null;

  const endMinutes =
    reservation.endTime
      ? timeToMinutes(reservation.endTime)
      : null;


  slots.forEach(time => {

    const minutes =
      timeToMinutes(time);

    const booked =
      isBooked(time);

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "time-slot";

    button.title =
      time;


    if (minutes % 60 === 0) {

      button.innerHTML =
        `<span class="slot-label">${String(Math.floor(minutes / 60)).padStart(2, "0")}</span>`;

    }


    if (booked) {

      button.classList.add(
        "booked"
      );

      button.disabled = true;

      timeSlotGrid.appendChild(
        button
      );

      return;

    }


    if (
      startMinutes !== null &&
      endMinutes !== null &&
      minutes >= startMinutes &&
      minutes < endMinutes
    ) {

      button.classList.add(
        "selected"
      );

    }


    else if (
      startMinutes !== null &&
      endMinutes === null &&
      minutes === startMinutes
    ) {

      button.classList.add(
        "selected",
        "start-only"
      );

    }


    button.addEventListener(
      "click",
      () => handleSlotClick(time)
    );


    timeSlotGrid.appendChild(
      button
    );

  });

}


// ==========================================
// 시간 선택
// ==========================================

function handleSlotClick(time) {

  const clicked =
    timeToMinutes(time);


  if (
    !reservation.startTime ||
    reservation.endTime
  ) {

    reservation.startTime =
      time;

    reservation.endTime =
      "";

  }

  else {

    const start =
      timeToMinutes(
        reservation.startTime
      );


    if (clicked <= start) {

      reservation.startTime =
        time;

      reservation.endTime =
        "";

    }

    else {

      const end =
        addMinutes(time, 30);


      if (
        hasBookedBetween(
          reservation.startTime,
          end
        )
      ) {

        alert(
          "선택한 구간 중간에 이미 예약이 있어요."
        );

        return;

      }


      reservation.endTime =
        end;

    }

  }


  renderTimeSlots();

  updateDuration();

  updateQuickTime();

  validateReservation();

}


// ==========================================
// 예약 중간 충돌
// ==========================================

function hasBookedBetween(
  startTime,
  endTime
) {

  const start =
    timeToMinutes(startTime);

  const end =
    timeToMinutes(endTime);


  return bookedReservations.some(item => {

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

  });

}


// ==========================================
// 빠른 시간 선택
// ==========================================

document
  .querySelectorAll(".quick-time-button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        if (!reservation.startTime) {

          alert(
            "먼저 시작시간을 선택해주세요."
          );

          return;

        }


        const duration =
          button.dataset.duration;


        let endTime;


        if (duration === "all") {

          endTime =
            centers[
              reservation.center
            ].close;

        }

        else {

          // 이미 종료시간이 있으면 거기서부터 누적해서 더함
          // (예: +1시간을 세 번 누르면 총 +3시간)
          const base =
            reservation.endTime ||
            reservation.startTime;

          endTime =
            addMinutes(
              base,
              Number(duration)
            );

        }


        const close =
          timeToMinutes(
            centers[
              reservation.center
            ].close
          );


        if (
          timeToMinutes(endTime) > close
        ) {

          alert(
            "센터 운영시간을 초과합니다."
          );

          return;

        }


        if (
          hasBookedBetween(
            reservation.startTime,
            endTime
          )
        ) {

          alert(
            "선택한 시간 안에 이미 예약된 시간이 있습니다."
          );

          return;

        }


        reservation.endTime =
          endTime;


        renderTimeSlots();

        updateDuration();

        updateQuickTime();

        validateReservation();

      }
    );

  });


// ==========================================
// 총 이용시간
// ==========================================

function updateDuration() {

  const strong =
    document
      .getElementById("durationDisplay")
      .querySelector("strong");


  if (
    !reservation.startTime ||
    !reservation.endTime
  ) {

    strong.textContent =
      "선택해주세요";

    return;

  }


  const difference =
    timeToMinutes(
      reservation.endTime
    ) -
    timeToMinutes(
      reservation.startTime
    );


  if (difference <= 0) {

    strong.textContent =
      "선택해주세요";

    return;

  }


  const hours =
    Math.floor(
      difference / 60
    );

  const minutes =
    difference % 60;


  let result = "";


  if (hours) {

    result +=
      `${hours}시간`;

  }


  if (minutes) {

    if (result) {
      result += " ";
    }

    result +=
      `${minutes}분`;

  }


  strong.textContent =
    result;

}


// ==========================================
// 빠른 시간 표시
// ==========================================

function updateQuickTime() {

  const element =
    document.getElementById(
      "quickTime"
    );


  if (
    reservation.startTime &&
    reservation.endTime
  ) {

    element.textContent =
      `${reservation.startTime} ~ ${reservation.endTime}`;

    return;

  }


  if (reservation.startTime) {

    element.textContent =
      `${reservation.startTime} ~`;

    return;

  }


  element.textContent =
    "선택하기";

}


// ==========================================
// 주간 예약 현황
// ==========================================

let weekOffset = 0;


function getStartOfWeek(date) {

  const result =
    new Date(date);

  const day =
    result.getDay();

  result.setDate(
    result.getDate() - day
  );

  result.setHours(
    0, 0, 0, 0
  );

  return result;

}


function getWeekDates() {

  const base =
    new Date();

  base.setDate(
    base.getDate() +
    weekOffset * 7
  );


  const start =
    getStartOfWeek(base);

  const dates = [];


  for (let i = 0; i < 7; i++) {

    const date =
      new Date(start);

    date.setDate(
      start.getDate() + i
    );

    dates.push(date);

  }


  return dates;

}


async function renderWeeklyReservation() {

  const section =
    document.getElementById(
      "weeklyReservationSection"
    );


  if (
    !reservation.center ||
    !reservation.room
  ) {

    section.style.display =
      "none";

    return;

  }


  section.style.display =
    "block";


  const dates =
    getWeekDates();


  const startDate =
    dateToString(dates[0]);

  const endDate =
    dateToString(dates[6]);


  document.getElementById(
    "weeklyDateRange"
  ).textContent =
    `${dates[0].getFullYear()}년 ${dates[0].getMonth() + 1}월 ${dates[0].getDate()}일 ~ ${dates[6].getMonth() + 1}월 ${dates[6].getDate()}일`;


  const { data, error } =
    await supabaseClient
      .from("Reservations")
      .select(`
        date,
        start_time,
        end_time,
        user_name,
        department,
        purpose
      `)
      .eq(
        "center",
        reservation.center
      )
      .eq(
        "room",
        reservation.room
      )
      .gte(
        "date",
        startDate
      )
      .lte(
        "date",
        endDate
      )
      .order(
        "start_time",
        { ascending: true }
      );


  if (error) {

    console.error(
      "주간 예약 조회 오류:",
      error
    );

    return;

  }


  const reservations =
    data || [];


  const calendar =
    document.getElementById(
      "weeklyCalendar"
    );


  calendar.innerHTML = "";


  const dayNames =
    [
      "일",
      "월",
      "화",
      "수",
      "목",
      "금",
      "토"
    ];


  const todayString =
    dateToString(
      new Date()
    );


  dates.forEach(
    (date, index) => {

      const dateString =
        dateToString(date);


      const dayColumn =
        document.createElement(
          "div"
        );

      dayColumn.className =
        "week-day";


      const header =
        document.createElement(
          "div"
        );

      header.className =
        "week-day-header";


      if (index === 0) {
        header.classList.add("sun");
      }

      if (index === 6) {
        header.classList.add("sat");
      }

      if (dateString === todayString) {
        header.classList.add("today");
      }


      header.innerHTML = `
        <span class="day-name">${dayNames[index]}</span>
        <span class="day-number">${date.getDate()}</span>
      `;


      const body =
        document.createElement(
          "div"
        );

      body.className =
        "week-day-body";


      const dayReservations =
        reservations.filter(
          item =>
            item.date === dateString
        );


      if (!dayReservations.length) {

        body.innerHTML =
          `<div class="week-empty">예약 없음</div>`;

      }


      dayReservations.forEach(
        item => {

          const card =
            document.createElement(
              "div"
            );

          card.className =
            "week-reservation";


          card.innerHTML = `
            <div class="week-reservation-time">
              ${item.start_time} ~ ${item.end_time}
            </div>

            <div class="week-reservation-name">
              ${escapeHTML(item.user_name || "")}
            </div>

            <div class="week-reservation-department">
              ${escapeHTML(item.department || "")}
            </div>

            <div class="week-reservation-purpose">
              ${escapeHTML(item.purpose || "")}
            </div>
          `;


          body.appendChild(card);

        }
      );


      dayColumn.appendChild(header);

      dayColumn.appendChild(body);

      calendar.appendChild(dayColumn);

    }
  );

}


// ==========================================
// 주간 이동
// ==========================================

document.getElementById(
  "prevWeek"
).addEventListener(
  "click",
  async () => {

    weekOffset--;

    await renderWeeklyReservation();

  }
);


document.getElementById(
  "nextWeek"
).addEventListener(
  "click",
  async () => {

    weekOffset++;

    await renderWeeklyReservation();

  }
);


document.getElementById(
  "thisWeekButton"
).addEventListener(
  "click",
  async () => {

    weekOffset = 0;

    await renderWeeklyReservation();

  }
);


// ==========================================
// HTML escape
// ==========================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==========================================
// 반복 예약
// ==========================================

document
  .querySelectorAll(
    'input[name="reservationType"]'
  )
  .forEach(radio => {

    radio.addEventListener(
      "change",
      () => {

        const recurring =
          document.querySelector(
            'input[name="reservationType"]:checked'
          ).value === "recurring";


        reservation.isRecurring =
          recurring;

        // 고정 사용으로 바꾸면 시작 날짜 1개만 남기고 정리
        if (recurring && reservation.dates.length > 1) {

          reservation.dates =
            [reservation.dates[0]];

          reservation.date =
            reservation.dates[0];

          renderCalendar();
          updateSelectedDatesUI();

        }


        document.getElementById(
          "recurringOptions"
        ).style.display =
          recurring
            ? "block"
            : "none";

      }
    );

  });


// ==========================================
// 고정예약 - 반복 요일 다중선택
// ==========================================

document
  .querySelectorAll(
    '#weekdayCheckboxes input[type="checkbox"]'
  )
  .forEach(checkbox => {

    checkbox.addEventListener(
      "change",
      () => {

        reservation.recurringWeekdays =
          Array.from(
            document.querySelectorAll(
              '#weekdayCheckboxes input[type="checkbox"]:checked'
            )
          ).map(el => Number(el.value));

      }
    );

  });


document.getElementById(
  "recurringMonths"
).addEventListener(
  "change",
  event => {

    const customInput =
      document.getElementById(
        "recurringMonthsCustom"
      );

    if (event.target.value === "custom") {

      customInput.style.display = "block";

      reservation.recurringMonths =
        Number(customInput.value) || 1;

    } else {

      customInput.style.display = "none";

      reservation.recurringMonths =
        Number(event.target.value);

    }

  }
);


document.getElementById(
  "recurringMonthsCustom"
).addEventListener(
  "input",
  event => {

    const value =
      Math.max(1, Math.min(24, Number(event.target.value) || 1));

    reservation.recurringMonths = value;

  }
);


// ==========================================
// 인원
// ==========================================

const peopleCount =
  document.getElementById(
    "peopleCount"
  );


function updatePeople() {

  peopleCount.value =
    reservation.people;

  document.getElementById(
    "quickPeople"
  ).textContent =
    `${reservation.people}명`;

}


document.getElementById(
  "minusPeople"
).addEventListener(
  "click",
  () => {

    if (
      reservation.people > 1
    ) {

      reservation.people--;

      updatePeople();

    }

  }
);


document.getElementById(
  "plusPeople"
).addEventListener(
  "click",
  () => {

    if (
      reservation.capacity &&
      reservation.people <
      reservation.capacity
    ) {

      reservation.people++;

      updatePeople();

    }

  }
);


peopleCount.addEventListener(
  "change",
  () => {

    let value =
      parseInt(
        peopleCount.value,
        10
      );


    if (
      isNaN(value) ||
      value < 1
    ) {

      value = 1;

    }


    if (
      reservation.capacity &&
      value >
      reservation.capacity
    ) {

      value =
        reservation.capacity;

      alert(
        `${reservation.center}은 최대 ${reservation.capacity}명까지 이용할 수 있습니다.`
      );

    }


    reservation.people =
      value;

    updatePeople();

  }
);


// ==========================================
// 예약 가능 여부
// ==========================================

function validateReservation() {

  const nextButton =
    document.getElementById(
      "nextButton"
    );


  const complete =
    reservation.center &&
    reservation.rooms.length > 0 &&
    reservation.dates.length > 0 &&
    reservation.startTime &&
    reservation.endTime &&
    reservation.people > 0;


  nextButton.disabled =
    !complete;

}


// ==========================================
// 다음
// ==========================================

document.getElementById(
  "nextButton"
).addEventListener(
  "click",
  () => {

    showPage(userPage);

  }
);


// ==========================================
// 예약자 정보
// ==========================================

document.getElementById(
  "checkReservation"
).addEventListener(
  "click",
  () => {

    const name =
      document.getElementById(
        "userName"
      ).value.trim();

    const department =
      document.getElementById(
        "department"
      ).value.trim();
    
      const region =
      document.getElementById(
        "region"
      ).value.trim();

    const phone =
      document.getElementById(
        "phone")
        .value
        .replace(/-/g, "")
        .trim();

    const purpose =
      document.getElementById(
        "purpose"
      ).value.trim();

    const reservationPassword =
      document.getElementById(
        "reservationPassword"
      ).value.trim();

    if (!name) {

      alert(
        "예약자 이름을 입력해주세요."
      );

      return;

    }


    if (!department) {

      alert(
        "부서를 입력해주세요."
      );

      return;

    }

    if (!region) {

      alert(
        "지역을 입력해주세요."
      );

      return;

    }

    if (!phone) {

      alert(
        "연락처를 입력해주세요."
      );

      return;

    }


    if (!purpose) {

      alert(
        "사용 목적을 입력해주세요."
      );

      return;

    }

    if (!reservationPassword) {

      alert(
        "예약 비밀번호를 입력해주세요."
      );

      return;

    }

    if (reservationPassword.length < 4) {

      alert(
        "예약 비밀번호는 최소 4자리 이상이어야 합니다."
      );

      return;

    }

    reservation.userName =
      name;

    reservation.department =
      department;

    reservation.region =
      region;

    reservation.phone =
      phone;

    reservation.purpose =
      purpose;

    reservation.reservationPassword =
      reservationPassword;
      
    updateConfirmation();

    showPage(confirmPage);

  }
);


// ==========================================
// 확인 페이지
// ==========================================

function updateConfirmation() {

  document.getElementById(
    "confirmCenter"
  ).textContent =
    reservation.center;


  document.getElementById(
    "confirmRoom"
  ).textContent =
    reservation.rooms.join(" + ");


  document.getElementById(
    "confirmDate"
  ).textContent =
    reservation.isRecurring || reservation.dates.length <= 1
      ? formatDate(reservation.date)
      : `${formatDate(reservation.dates[0])} 외 ${reservation.dates.length - 1}일`;


  document.getElementById(
    "confirmTime"
  ).textContent =
    `${reservation.startTime} ~ ${reservation.endTime}`;


  document.getElementById(
    "confirmPeople"
  ).textContent =
    `${reservation.people}명`;


  document.getElementById(
    "confirmReservationType"
  ).textContent =
    reservation.isRecurring
      ? `고정 사용 · ${reservation.recurringMonths}개월`
      : "일회성 사용";


  document.getElementById(
    "confirmName"
  ).textContent =
    reservation.userName;


  document.getElementById(
    "confirmDepartment"
  ).textContent =
    reservation.department;

  document.getElementById(
    "confirmRegion"
  ).textContent =
    reservation.region;

  document.getElementById(
    "confirmPhone"
  ).textContent =
    reservation.phone;


  document.getElementById(
    "confirmPurpose"
  ).textContent =
    reservation.purpose;

}


// ==========================================
// 날짜 표시
// ==========================================

function formatDate(dateString) {

  const [
    year,
    month,
    day
  ] =
    dateString.split("-");


  return `${year}년 ${Number(month)}월 ${Number(day)}일`;

}


// ==========================================
// 이전
// ==========================================

document.getElementById(
  "backToReservation"
).addEventListener(
  "click",
  () => {

    showPage(reservationPage);

  }
);


document.getElementById(
  "backToUser"
).addEventListener(
  "click",
  () => {

    showPage(userPage);

  }
);


// ==========================================
// 반복 예약 날짜 생성
// ==========================================

function getRecurringDates() {

  const dates = [];

  if (
    !reservation.isRecurring ||
    !reservation.date
  ) {

    // 일회성: 선택된 모든 날짜를 그대로 반환 (다중 선택)
    return [
      ...reservation.dates
    ];

  }


  const start =
    new Date(
      `${reservation.date}T00:00:00`
    );


  const end =
    new Date(start);


  end.setMonth(
    end.getMonth() +
    reservation.recurringMonths
  );


  // 체크된 요일이 없으면, 시작일의 요일로 자동 반복
  const targetDays =
    reservation.recurringWeekdays.length > 0
      ? reservation.recurringWeekdays
      : [start.getDay()];


  const current =
    new Date(start);


  while (current < end) {

    if (
      targetDays.includes(
        current.getDay()
      )
    ) {

      dates.push(
        dateToString(current)
      );

    }

    current.setDate(
      current.getDate() + 1
    );

  }


  return dates;

}


// ==========================================
// 예약 신청
// ==========================================

document.getElementById(
  "reserveButton"
).addEventListener(
  "click",
  async () => {

    const button =
      document.getElementById(
        "reserveButton"
      );


    button.disabled =
      true;

    button.textContent =
      "예약 저장 중...";


    try {

      let groupId = null;


      if (
        reservation.isRecurring
      ) {

        groupId =
          crypto.randomUUID();

      }


      const dates =
        getRecurringDates();


      // 날짜 × 공간(여러 개 선택 가능) 조합으로 저장
      const rows = [];

      dates.forEach(date => {

        reservation.rooms.forEach(room => {

          rows.push({

            center:
              reservation.center,

            room:
              room,

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

            reservation_password:
              reservation.reservationPassword,

            is_recurring:
              reservation.isRecurring,

            recurring_months:
              reservation.isRecurring
                ? reservation.recurringMonths
                : null,

            recurring_group_id:
              groupId,
            
            recurring_weekdays:
              reservation.isRecurring
                ? reservation.recurringWeekdays
                : null
      

          });

        });

      });


      const {
        data,
        error
      } =
        await supabaseClient
          .from("Reservations")
          .insert(rows)
          .select();


      console.log(
        "Supabase data:",
        data
      );

      console.log(
        "Supabase error:",
        error
      );


      if (error) {

        alert(
          "예약 저장에 실패했습니다.\n\n" +
          JSON.stringify(
            error,
            null,
            2
          )
        );


        button.disabled =
          false;

        button.textContent =
          "예약 신청하기";

        return;

      }


      const recurringText =
        reservation.isRecurring
          ? `<br>고정 사용 : ${reservation.recurringMonths}개월`
          : "";


      const dateSummary =
        reservation.isRecurring || reservation.dates.length <= 1
          ? formatDate(reservation.date)
          : `${formatDate(reservation.dates[0])} 외 ${reservation.dates.length - 1}일 (총 ${reservation.dates.length}건)`;

      const summary = `

        <strong>
          ${escapeHTML(reservation.center)}
          ·
          ${escapeHTML(reservation.room)}
        </strong>

        <br>

        ${dateSummary}

        <br>

        ${reservation.startTime}
        ~
        ${reservation.endTime}

        ${recurringText}

        <br>

        ${reservation.people}명

        <br><br>

        예약자 :
        ${escapeHTML(reservation.userName)}

        <br>

        부서 :
        ${escapeHTML(reservation.department)}

      `;


      document.getElementById(
        "completeSummary"
      ).innerHTML =
        summary;


      showPage(
        completePage
      );


    }

    catch (error) {

      console.error(
        "예약 처리 오류:",
        error
      );


      alert(
        "예약 처리 중 문제가 발생했습니다.\n\n" +
        JSON.stringify(
          error,
          null,
          2
        )
      );


      button.disabled =
        false;

      button.textContent =
        "예약 신청하기";

    }

  }
);


// ==========================================
// 처음으로
// ==========================================

document.getElementById(
  "homeButton"
).addEventListener(
  "click",
  () => {

    location.reload();

  }
);


// ==========================================
// 로고
// ==========================================

document.getElementById(
  "logoHome"
).addEventListener(
  "click",
  () => {

    showPage(
      reservationPage
    );

  }
);

// ==========================================
// 내 예약정보 확인
// ==========================================

document.getElementById(
  "myReservationButton"
).addEventListener(
  "click",
  () => {

    showPage(
      myReservationPage
    );

  }
);

// ==========================================
// 홈으로 돌아가기
// ==========================================

document.getElementById(
  "backToHomeFromMyReservation"
).addEventListener(
  "click",
  () => {

    showPage(
      reservationPage
    );

  }
);

// ==========================================
// 조회 버튼 
// ==========================================

const checkMyReservationButton =
  document.getElementById(
    "checkMyReservationButton"
  );
checkMyReservationButton.addEventListener(
  "click",
  async (event) => {event.preventDefault();
    await checkMyReservations();
  }
);
// ======================================
// 내 예약 조회 
// ======================================

async function checkMyReservations() {

  const name =
    document.getElementById(
      "myReservationName"
    ).value.trim();

  const phone =
    document.getElementById(
      "myReservationPhone"
    ).value
    .replace(/-/g, "");

  const password =
    document.getElementById(
      "myReservationPassword"
    ).value.trim();

// ==========================================
// 입력값 확인 
// ==========================================

if (!name || !phone || !password) {

  alert(
    "예약자 이름, 연락처, 예약 비밀번호를 입력해주세요."
  );
  return;}

// ==========================================
// Supabase에서 예약 정보 조회
// ==========================================
  const { data, error } =
    await supabaseClient
      .from("Reservations")
      .select("*")
      .eq("user_name", name)
      .eq("phone", phone)
      .eq("reservation_password", password)
      .order("date", { ascending: true });

  if (error) {
    console.error(
      "예약 조회 오류:",
      error);
    alert(
      "예약 조회 중 오류가 발생했습니다."
    );
    return;
  }

  if (!data || data.length === 0) {
    alert(
      "예약 정보가 없습니다. 입력하신 정보를 확인해주세요."
    );
    return;
  }

  console.log(
    "예약 조회 결과:",
    data
  );

  // 조회 결과 저장
  myReservations = data;

  // 예약 정보 표시
  renderMyReservations(myReservations);
}

// ======================================
// 내 예약 목록 표시
// ======================================

function renderMyReservations(reservations) {

  const list =
    document.getElementById(
      "myReservationList"
    );

  if (!list) {

    console.error(
      "myReservationList 요소를 찾을 수 없습니다."
    );

    return;

  }


  list.innerHTML = "";


  // 예약이 없는 경우
  if (!reservations || reservations.length === 0) {

    list.innerHTML = `
      <div class="my-reservation-empty">
        조회된 예약 정보가 없습니다.
      </div>
    `;

    showPage(
      document.getElementById(
        "myReservationListPage"
      )
    );

    return;

  }


  reservations.forEach(reservation => {

    const card =
      document.createElement("div");

    card.className =
      "my-reservation-card";


    const reservationType =
      reservation.is_recurring
        ? "고정예약"
        : "일회성";


    const dateText =
      reservation.date
        ? formatDate(reservation.date)
        : "-";


    const timeText =
      reservation.start_time &&
      reservation.end_time
        ? `${reservation.start_time} ~ ${reservation.end_time}`
        : "-";


    const peopleText =
      reservation.people
        ? `${reservation.people}명`
        : "-";


    card.innerHTML = `

      <!-- =========================
           예약 상단
      ========================== -->

      <div class="my-reservation-card-top">

        <div>

          <div class="reservation-center">
            ${escapeHTML(
              reservation.center || "-"
            )}
          </div>

          <div class="reservation-room">
            ${escapeHTML(
              reservation.room || "-"
            )}
          </div>

        </div>


        <span class="reservation-status">
          ${reservationType}
        </span>

      </div>


      <!-- =========================
           예약 기본 정보
      ========================== -->

      <div class="my-reservation-info">

        <div>

          <span>이용날짜</span>

          <strong>
            ${dateText}
          </strong>

        </div>


        <div>

          <span>이용시간</span>

          <strong>
            ${timeText}
          </strong>

        </div>


        <div>

          <span>이용인원</span>

          <strong>
            ${peopleText}
          </strong>

        </div>

      </div>


      <!-- =========================
           상세 정보
      ========================== -->

      <div class="my-reservation-extra">

        <div class="my-reservation-extra-row">

          <span>사용 목적</span>

          <strong>
            ${escapeHTML(
              reservation.purpose || "-"
            )}
          </strong>

        </div>


        <div class="my-reservation-extra-grid">

          <div>

            <span>예약자</span>

            <strong>
              ${escapeHTML(
                reservation.user_name || "-"
              )}
            </strong>

          </div>


          <div>

            <span>부서</span>

            <strong>
              ${escapeHTML(
                reservation.department || "-"
              )}
            </strong>

          </div>


          <div>

            <span>센터(지역)</span>

            <strong>
              ${escapeHTML(
                reservation.region || "-"
              )}
            </strong>

          </div>


          <div>

            <span>연락처</span>

            <strong>
              ${escapeHTML(
                reservation.phone || "-"
              )}
            </strong>

          </div>

        </div>

      </div>


      <!-- =========================
           상세보기 버튼
      ========================== -->

      <button
        type="button"
        class="main-button"
        data-id="${reservation.id}"
      >
        예약 상세보기
      </button>

    `;


    const detailButton =
      card.querySelector(
        "button[data-id]"
      );


    detailButton.addEventListener(
      "click",
      () => {

        openMyReservationDetail(
          reservation.id
        );

      }
    );


    list.appendChild(card);

  });


  showPage(
    document.getElementById(
      "myReservationListPage"
    )
  );

}

function openMyReservationDetail(reservationId) {

  const reservation = myReservations.find(
    item => String(item.id) === String(reservationId)
  );

  if (!reservation) {
    alert("예약 정보를 찾을 수 없습니다.");
    return;
  }

  renderMyReservationDetail(reservation);

}

function renderMyReservationDetail(r) {

  const detail = document.getElementById("myReservationDetail");

  detail.innerHTML = `
    <div class="reservation-detail-box">

      <h2>예약 상세정보</h2>

      <div class="detail-row">
        <span>센터</span>
        <strong>${r.center || ""}</strong>
      </div>

      <div class="detail-row">
        <span>공간</span>
        <strong>${r.room || ""}</strong>
      </div>

      <div class="detail-row">
        <span>날짜</span>
        <strong>${formatDate(r.date)}</strong>
      </div>

      <div class="detail-row">
        <span>시간</span>
        <strong>${r.start_time} ~ ${r.end_time}</strong>
      </div>

      <div class="detail-row">
        <span>인원</span>
        <strong>${r.people}명</strong>
      </div>

      <div class="detail-row">
        <span>사용 목적</span>
        <strong>${r.purpose || ""}</strong>
      </div>


      <div class="reservation-actions">

        <button
          type="button"
          class="sub-button"
          onclick="editMyReservation('${r.id}')"
        >
          예약 수정
        </button>

        <button
          type="button"
          class="delete-button"
          onclick="cancelMyReservation('${r.id}')"
        >
          예약 취소
        </button>

      </div>

    </div>
  `;


  document
    .querySelectorAll(".page")
    .forEach(page => page.classList.remove("active"));

  document
    .getElementById("myReservationDetailPage")
    .classList.add("active");

}

// ==========================================
// 내 예약 - 예약 수정
// ==========================================

function editMyReservation(reservationId) {

  const target =
    myReservations.find(
      item => String(item.id) === String(reservationId)
    );

  if (!target) {

    alert("예약 정보를 찾을 수 없습니다.");

    return;

  }


  const detail =
    document.getElementById("myReservationDetail");


  // 센터 운영시간 기준 시간 옵션 생성
  const centerInfo =
    centers[target.center];

  if (!centerInfo) {

    alert("센터 정보를 찾을 수 없습니다.");

    return;

  }


  const startMinutes =
    timeToMinutes(centerInfo.open);

  const closeMinutes =
    timeToMinutes(centerInfo.close);


  // 시작시간 옵션
  let startTimeOptions = "";

  for (
    let minute = startMinutes;
    minute < closeMinutes;
    minute += 30
  ) {

    const time =
      minutesToTime(minute);

    startTimeOptions += `
      <option
        value="${time}"
        ${time === target.start_time ? "selected" : ""}
      >
        ${time}
      </option>
    `;

  }


  // 종료시간 옵션
  let endTimeOptions = "";

  for (
    let minute = startMinutes + 30;
    minute <= closeMinutes;
    minute += 30
  ) {

    const time =
      minutesToTime(minute);

    endTimeOptions += `
      <option
        value="${time}"
        ${time === target.end_time ? "selected" : ""}
      >
        ${time}
      </option>
    `;

  }


  detail.innerHTML = `

    <div class="reservation-detail-box">

      <h2>예약 수정</h2>


      <div class="detail-row">
        <span>센터</span>
        <strong>
          ${escapeHTML(target.center || "")}
        </strong>
      </div>


      <div class="detail-row">
        <span>공간</span>
        <strong>
          ${escapeHTML(target.room || "")}
        </strong>
      </div>


      <div class="detail-row">
        <span>날짜</span>

        <input
          type="date"
          id="editReservationDate"
          value="${target.date || ""}"
        >
      </div>


      <div class="detail-row">
        <span>시작시간</span>

        <select id="editReservationStart">
          ${startTimeOptions}
        </select>
      </div>


      <div class="detail-row">
        <span>종료시간</span>

        <select id="editReservationEnd">
          ${endTimeOptions}
        </select>
      </div>


      <div class="detail-row">
        <span>인원</span>

        <input
          type="number"
          id="editReservationPeople"
          min="1"
          max="${centerInfo.capacity}"
          value="${target.people || 1}"
        >
      </div>


      <div class="detail-row">
        <span>사용 목적</span>

        <textarea
          id="editReservationPurpose"
          rows="4"
        >${escapeHTML(target.purpose || "")}</textarea>

      </div>


      <div class="reservation-actions">

        <button
          type="button"
          class="sub-button"
          onclick="saveMyReservation('${target.id}')"
        >
          수정 저장
        </button>


        <button
          type="button"
          class="delete-button"
          onclick="renderMyReservationDetailById('${target.id}')"
        >
          수정 취소
        </button>

      </div>

    </div>

  `;


  // 날짜가 과거로 가지 않도록 오늘 날짜 설정
  const dateInput =
    document.getElementById(
      "editReservationDate"
    );

  if (dateInput) {

    dateInput.min =
      dateToString(new Date());

  }

}


// ==========================================
// 내 예약 - 수정된 예약 상세 다시 보기
// ==========================================

function renderMyReservationDetailById(reservationId) {

  const target =
    myReservations.find(
      item => String(item.id) === String(reservationId)
    );

  if (!target) {

    alert("예약 정보를 찾을 수 없습니다.");

    return;

  }

  renderMyReservationDetail(target);

}


// ==========================================
// 내 예약 - 수정 저장
// ==========================================

async function saveMyReservation(reservationId) {

  const target =
    myReservations.find(
      item => String(item.id) === String(reservationId)
    );

  if (!target) {

    alert("예약 정보를 찾을 수 없습니다.");

    return;

  }


  const date =
    document
      .getElementById("editReservationDate")
      .value;

  const startTime =
    document
      .getElementById("editReservationStart")
      .value;

  const endTime =
    document
      .getElementById("editReservationEnd")
      .value;

  const people =
    Number(
      document
        .getElementById("editReservationPeople")
        .value
    );

  const purpose =
    document
      .getElementById("editReservationPurpose")
      .value
      .trim();


  // =========================
  // 기본 입력 확인
  // =========================

  if (!date) {

    alert("날짜를 선택해주세요.");

    return;

  }


  if (!startTime || !endTime) {

    alert("시작시간과 종료시간을 선택해주세요.");

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


  if (
    !people ||
    people < 1
  ) {

    alert("이용 인원을 확인해주세요.");

    return;

  }


  const centerInfo =
    centers[target.center];


  if (
    centerInfo &&
    people > centerInfo.capacity
  ) {

    alert(
      `${target.center}은 최대 ${centerInfo.capacity}명까지 이용할 수 있습니다.`
    );

    return;

  }


  // =========================
  // 예약 충돌 확인
  // =========================

  const {
    data: conflictData,
    error: conflictError
  } =
    await supabaseClient
      .from("Reservations")
      .select(
        "id, start_time, end_time"
      )
      .eq(
        "center",
        target.center
      )
      .eq(
        "room",
        target.room
      )
      .eq(
        "date",
        date
      )
      .neq(
        "id",
        reservationId
      );


  if (conflictError) {

    console.error(
      "예약 충돌 확인 오류:",
      conflictError
    );

    alert(
      "예약 가능 여부를 확인하는 중 오류가 발생했습니다."
    );

    return;

  }


  const hasConflict =
    (conflictData || []).some(item => {

      const bookedStart =
        timeToMinutes(
          item.start_time
        );

      const bookedEnd =
        timeToMinutes(
          item.end_time
        );

      const newStart =
        timeToMinutes(
          startTime
        );

      const newEnd =
        timeToMinutes(
          endTime
        );

      return (
        newStart < bookedEnd &&
        newEnd > bookedStart
      );

    });


  if (hasConflict) {

    alert(
      "선택한 날짜와 시간에 이미 예약이 있습니다."
    );

    return;

  }


  // =========================
  // Supabase 수정
  // =========================

  const {
    data,
    error
  } =
    await supabaseClient
      .from("Reservations")
      .update({

        date:
          date,

        start_time:
          startTime,

        end_time:
          endTime,

        people:
          people,

        purpose:
          purpose

      })
      .eq(
        "id",
        reservationId
      )
      .select()
      .single();


  if (error) {

    console.error(
      "예약 수정 오류:",
      error
    );

    alert(
      "예약 수정에 실패했습니다."
    );

    return;

  }


  // =========================
  // 현재 조회 목록 갱신
  // =========================

  const index =
    myReservations.findIndex(
      item =>
        String(item.id) ===
        String(reservationId)
    );


  if (index !== -1) {

    myReservations[index] =
      data;

  }


  alert(
    "예약 정보가 수정되었습니다."
  );


  // 수정된 상세정보 다시 표시
  renderMyReservationDetail(
    data
  );

}

// ==========================================
// 내 예약 - 예약 취소
// ==========================================

async function cancelMyReservation(reservationId) {

  const target =
    myReservations.find(
      item =>
        String(item.id) === String(reservationId)
    );

  if (!target) {

    alert("예약 정보를 찾을 수 없습니다.");

    return;

  }


  // =========================
  // 고정예약인지 확인
  // =========================

  const isRecurring =
    target.is_recurring &&
    target.recurring_group_id;


  let choice;


  if (isRecurring) {

    choice =
      confirm(
        "고정예약 전체를 취소할까요?\n\n" +
        "확인을 누르면 이 고정예약에 포함된\n" +
        "모든 날짜와 공간 예약이 전체 삭제됩니다.\n\n" +
        "취소를 누르면 취소하지 않습니다."
      );

  } else {

    choice =
      confirm(
        "이 예약을 취소할까요?"
      );

  }


  if (!choice) {

    return;

  }


  // =========================
  // Supabase 삭제
  // =========================

  let deleteQuery =
    supabaseClient
      .from("Reservations")
      .delete();


  if (isRecurring) {

    // 고정예약 전체 삭제
    deleteQuery =
      deleteQuery.eq(
        "recurring_group_id",
        target.recurring_group_id
      );

  } else {

    // 일회성 예약 1건 삭제
    deleteQuery =
      deleteQuery.eq(
        "id",
        reservationId
      );

  }


  const { error } =
    await deleteQuery;


  if (error) {

    console.error(
      "예약 취소 오류:",
      error
    );

    alert(
      "예약 취소에 실패했습니다.\n\n" +
      error.message
    );

    return;

  }


  // =========================
  // 현재 조회 목록에서도 제거
  // =========================

  if (isRecurring) {

    myReservations =
      myReservations.filter(
        item =>
          item.recurring_group_id !==
          target.recurring_group_id
      );

  } else {

    myReservations =
      myReservations.filter(
        item =>
          String(item.id) !==
          String(reservationId)
      );

  }


  alert(
    isRecurring
      ? "고정예약 전체가 취소되었습니다."
      : "예약이 취소되었습니다."
  );


  // =========================
  // 남은 예약이 있으면 목록 표시
  // =========================

  renderMyReservations(
    myReservations
  );

}

// =========================
// 내 예약 목록으로 돌아가기
// =========================

  renderMyReservations(
    myReservations
  );
  
// ==========================================
// 예약 목록 → 예약 조회 화면으로
// ==========================================

function backToMyReservationForm() {

  showPage(
    document.getElementById(
      "myReservationPage"
    )
  );
}

// ==========================================
// 예약 상세 → 예약 목록으로 돌아가기
// ==========================================

function backToMyReservationList() {

  showPage(
    document.getElementById(
      "myReservationListPage"
    )
  );

}

// ==========================================
// 초기 실행
// ==========================================

updatePeople();

renderCalendar();

updateSelectedDatesUI();

renderTimeSlots();

updateDuration();

updateQuickTime();

validateReservation();
