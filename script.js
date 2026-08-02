const SUPABASE_URL =
  "https://ohnxhlbwzakwzhzhkhvt.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_v8DnBpF4GX4oABnGOfpRxA_QH6ruB5Q";


console.log("Supabase:", window.supabase);
console.log("Supabase Key:", SUPABASE_PUBLISHABLE_KEY);


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


// =====================================================
// 센터 설정
// =====================================================

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


// =====================================================
// 센터별 공간
// =====================================================

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


// =====================================================
// 예약 데이터
// =====================================================

const reservation = {

  center: "",
  capacity: 0,

  room: "",

  date: "",

  startTime: "",
  endTime: "",

  people: 2,

  userName: "",
  department: "",
  phone: "",
  purpose: ""

};


// =====================================================
// 페이지
// =====================================================

const reservationPage =
  document.getElementById("reservationPage");

const userPage =
  document.getElementById("userPage");

const confirmPage =
  document.getElementById("confirmPage");

const completePage =
  document.getElementById("completePage");


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


// =====================================================
// 센터 선택
// =====================================================

const centerOptions =
  document.querySelectorAll(".center-option");


centerOptions.forEach(option => {

  option.addEventListener("click", async () => {

    centerOptions
      .forEach(item =>
        item.classList.remove("selected")
      );

    option.classList.add("selected");


    reservation.center =
      option.dataset.center;

    reservation.capacity =
      Number(option.dataset.capacity);


    // 센터 변경 시 초기화

    reservation.room = "";

    reservation.date = "";

    reservation.startTime = "";
    reservation.endTime = "";


    document.getElementById("capacityText").textContent =
      `${reservation.center}은 최대 ${reservation.capacity}명까지 이용할 수 있습니다.`;


    document.getElementById("quickCenter").textContent =
      reservation.center;

    document.getElementById("quickRoom").textContent =
      "선택하기";

    document.getElementById("quickDate").textContent =
      "선택하기";

    document.getElementById("quickTime").textContent =
      "선택하기";


    if (
      reservation.people >
      reservation.capacity
    ) {

      reservation.people =
        reservation.capacity;

      updatePeople();

    }


    renderRooms();

    renderTimeSlots();

    updateDuration();

    updateQuickTime();

    validateReservation();


    // 월간 달력 예약 점 갱신

    await loadCalendarReservationDates();


    // 주간 현황

    renderWeeklySchedule();

  });

});


// =====================================================
// 공간 선택
// =====================================================

const roomSection =
  document.getElementById("roomSection");

const roomGrid =
  document.getElementById("roomGrid");


function renderRooms() {

  roomGrid.innerHTML = "";

  const rooms =
    roomsByCenter[reservation.center] || [];


  if (!rooms.length) {

    roomSection.style.display =
      "none";

    return;
  }


  roomSection.style.display =
    "block";


  rooms.forEach(room => {

    const button =
      document.createElement("button");


    button.type = "button";

    button.className =
      "room-option";

    button.textContent =
      room;


    if (
      reservation.room === room
    ) {

      button.classList.add(
        "selected"
      );

    }


    button.addEventListener(
      "click",
      async () => {

        reservation.room =
          room;

        reservation.startTime =
          "";

        reservation.endTime =
          "";


        document.getElementById(
          "quickRoom"
        ).textContent = room;


        renderRooms();


        await loadBookedReservations();

        await loadCalendarReservationDates();


        updateDuration();

        updateQuickTime();

        validateReservation();


        renderWeeklySchedule();

      }
    );


    roomGrid.appendChild(button);

  });

}


// =====================================================
// 달력
// =====================================================

const calendarDays =
  document.getElementById(
    "calendarDays"
  );

const monthTitle =
  document.getElementById(
    "monthTitle"
  );


let currentDate =
  new Date();


const today =
  new Date();


/*
  현재 달에 예약이 존재하는 날짜들
*/
let reservationDates =
  new Set();


function getDateString(date) {

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


async function loadCalendarReservationDates() {

  reservationDates =
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


  const firstDate =
    new Date(
      year,
      month,
      1
    );


  const lastDate =
    new Date(
      year,
      month + 1,
      0
    );


  const startDate =
    getDateString(firstDate);

  const endDate =
    getDateString(lastDate);


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("Reservations")
        .select("date")
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
        );


    if (error) {

      console.error(
        "달력 예약 조회 오류:",
        error
      );

      renderCalendar();

      return;
    }


    (data || []).forEach(item => {

      reservationDates.add(
        item.date
      );

    });


    renderCalendar();


  } catch (error) {

    console.error(
      "달력 예약 조회 실패:",
      error
    );

    renderCalendar();

  }

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
      document.createElement("div");

    calendarDays.appendChild(
      empty
    );

  }


  const todayOnly =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );


  for (
    let day = 1;
    day <= lastDate;
    day++
  ) {

    const button =
      document.createElement("button");


    button.type = "button";

    button.textContent =
      day;


    const dateObject =
      new Date(
        year,
        month,
        day
      );


    const dateString =
      getDateString(dateObject);


    // 지난 날짜

    if (
      dateObject < todayOnly
    ) {

      button.classList.add(
        "disabled"
      );

      calendarDays.appendChild(
        button
      );

      continue;
    }


    // 오늘

    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    ) {

      button.classList.add(
        "today"
      );

    }


    // 예약 있는 날짜

    if (
      reservationDates.has(
        dateString
      )
    ) {

      button.classList.add(
        "has-reservation"
      );

    }


    // 현재 선택

    if (
      reservation.date === dateString
    ) {

      button.classList.add(
        "selected"
      );

    }


    button.addEventListener(
      "click",
      async () => {

        reservation.date =
          dateString;


        reservation.startTime =
          "";

        reservation.endTime =
          "";


        document.getElementById(
          "quickDate"
        ).textContent =
          `${year}년 ${month + 1}월 ${day}일`;


        renderCalendar();


        await loadBookedReservations();


        updateDuration();

        updateQuickTime();

        validateReservation();


        renderWeeklySchedule();

      }
    );


    calendarDays.appendChild(
      button
    );

  }

}


// 이전 달

document
  .getElementById("prevMonth")
  .addEventListener(
    "click",
    async () => {

      currentDate.setMonth(
        currentDate.getMonth() - 1
      );


      await loadCalendarReservationDates();

    }
  );


// 다음 달

document
  .getElementById("nextMonth")
  .addEventListener(
    "click",
    async () => {

      currentDate.setMonth(
        currentDate.getMonth() + 1
      );


      await loadCalendarReservationDates();

    }
  );


renderCalendar();


// =====================================================
// 시간
// =====================================================

function createTimeList() {

  const times = [];


  for (
    let hour = 0;
    hour < 24;
    hour++
  ) {

    for (
      let minute = 0;
      minute < 60;
      minute += 30
    ) {

      times.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );

    }

  }


  return times;

}


const allTimes =
  createTimeList();


function timeToMinutes(time) {

  const [
    hour,
    minute
  ] =
    time
      .split(":")
      .map(Number);


  return (
    hour * 60 +
    minute
  );

}


// =====================================================
// 시간 슬롯
// =====================================================

const timeSlotNotice =
  document.getElementById(
    "timeSlotNotice"
  );

const timeSlotWrapperOuter =
  document.getElementById(
    "timeSlotWrapperOuter"
  );

const timeSlotWrapper =
  document.getElementById(
    "timeSlotWrapper"
  );

const timeSlotGrid =
  document.getElementById(
    "timeSlotGrid"
  );


let bookedReservations = [];


async function loadBookedReservations() {

  if (
    !reservation.center ||
    !reservation.date ||
    !reservation.room
  ) {

    bookedReservations = [];

    renderTimeSlots();

    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("Reservations")
        .select(
          "start_time, end_time"
        )
        .eq(
          "center",
          reservation.center
        )
        .eq(
          "date",
          reservation.date
        )
        .eq(
          "room",
          reservation.room
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


    console.log(
      "현재 예약된 시간:",
      bookedReservations
    );


    renderTimeSlots();


  } catch (error) {

    console.error(
      "예약 조회 중 오류:",
      error
    );

    bookedReservations = [];

    renderTimeSlots();

  }

}


function isBooked(time) {

  const slotStart =
    timeToMinutes(time);

  const slotEnd =
    slotStart + 30;


  return bookedReservations.some(
    item => {

      const bookedStart =
        timeToMinutes(
          item.start_time
        );

      const bookedEnd =
        timeToMinutes(
          item.end_time
        );


      return (
        slotStart < bookedEnd &&
        slotEnd > bookedStart
      );

    }
  );

}


function generateSlots(
  open,
  close
) {

  const [
    oh,
    om
  ] =
    open
      .split(":")
      .map(Number);


  const [
    ch,
    cm
  ] =
    close
      .split(":")
      .map(Number);


  const startMinutes =
    oh * 60 + om;

  const endMinutes =
    ch * 60 + cm;


  const slots = [];


  for (
    let m = startMinutes;
    m < endMinutes;
    m += 30
  ) {

    const h =
      Math.floor(m / 60);

    const mm =
      m % 60;


    slots.push(
      `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
    );

  }


  return slots;

}


function addThirtyMinutes(time) {

  const minutes =
    timeToMinutes(time) + 30;


  const h =
    Math.floor(minutes / 60);

  const m =
    minutes % 60;


  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

}


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
      ? timeToMinutes(
          reservation.startTime
        )
      : null;


  const endMinutes =
    reservation.endTime
      ? timeToMinutes(
          reservation.endTime
        )
      : null;


  slots.forEach(time => {

    const minutes =
      timeToMinutes(time);


    const isHourMark =
      minutes % 60 === 0;


    const booked =
      isBooked(time);


    const button =
      document.createElement("button");


    button.type = "button";

    button.className =
      "time-slot";


    button.title =
      time;


    if (isHourMark) {

      button.innerHTML =
        `<span class="slot-label">
          ${String(Math.floor(minutes / 60)).padStart(2, "0")}
        </span>`;

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


function handleSlotClick(time) {

  const clickedMinutes =
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

    const startMinutes =
      timeToMinutes(
        reservation.startTime
      );


    if (
      clickedMinutes <= startMinutes
    ) {

      reservation.startTime =
        time;

      reservation.endTime =
        "";

    }
    else {

      const candidateEnd =
        addThirtyMinutes(time);


      if (
        hasBookedBetween(
          reservation.startTime,
          candidateEnd
        )
      ) {

        alert(
          "선택한 구간 중간에 이미 예약이 있어요.\n다른 시간을 선택해주세요."
        );

        return;
      }


      reservation.endTime =
        candidateEnd;

    }

  }


  renderTimeSlots();

  updateDuration();

  updateQuickTime();

  validateReservation();

}


function hasBookedBetween(
  startTime,
  endTime
) {

  const center =
    centers[reservation.center];


  const slots =
    generateSlots(
      center.open,
      center.close
    );


  const startMinutes =
    timeToMinutes(startTime);

  const endMinutes =
    timeToMinutes(endTime);


  return slots.some(time => {

    const minutes =
      timeToMinutes(time);


    return (
      minutes >= startMinutes &&
      minutes < endMinutes &&
      isBooked(time)
    );

  });

}


// =====================================================
// 이용시간 표시
// =====================================================

function updateDuration() {

  const durationDisplay =
    document.getElementById(
      "durationDisplay"
    );


  const durationText =
    durationDisplay.querySelector(
      "strong"
    );


  if (
    !reservation.startTime ||
    !reservation.endTime
  ) {

    durationText.textContent =
      "선택해주세요";

    return;
  }


  const start =
    timeToMinutes(
      reservation.startTime
    );

  const end =
    timeToMinutes(
      reservation.endTime
    );


  const difference =
    end - start;


  if (difference <= 0) {

    durationText.textContent =
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


  if (hours > 0) {

    result +=
      `${hours}시간`;

  }


  if (minutes > 0) {

    if (result) {
      result += " ";
    }

    result +=
      `${minutes}분`;

  }


  durationText.textContent =
    result;

}


// =====================================================
// 빠른 시간 표시
// =====================================================

function updateQuickTime() {

  const quickTime =
    document.getElementById(
      "quickTime"
    );


  if (
    reservation.startTime &&
    reservation.endTime
  ) {

    quickTime.textContent =
      `${reservation.startTime} ~ ${reservation.endTime}`;

    return;
  }


  if (reservation.startTime) {

    quickTime.textContent =
      `${reservation.startTime} ~`;

    return;
  }


  quickTime.textContent =
    "선택하기";

}


// =====================================================
// 시간 좌우 이동
// =====================================================

document
  .getElementById("prevSlot")
  .addEventListener(
    "click",
    () => {

      timeSlotWrapper.scrollBy({
        left: -156,
        behavior: "smooth"
      });

    }
  );


document
  .getElementById("nextSlot")
  .addEventListener(
    "click",
    () => {

      timeSlotWrapper.scrollBy({
        left: 156,
        behavior: "smooth"
      });

    }
  );


// =====================================================
// 인원
// =====================================================

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


document
  .getElementById("minusPeople")
  .addEventListener(
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


document
  .getElementById("plusPeople")
  .addEventListener(
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


updatePeople();


// =====================================================
// 예약 가능 여부
// =====================================================

function validateReservation() {

  const nextButton =
    document.getElementById(
      "nextButton"
    );


  const complete =

    reservation.center &&
    reservation.room &&
    reservation.date &&
    reservation.startTime &&
    reservation.endTime &&
    reservation.people > 0;


  nextButton.disabled =
    !complete;

}


validateReservation();


// =====================================================
// 주간 예약현황
// =====================================================

const weeklySection =
  document.getElementById(
    "weeklyScheduleSection"
  );

const weeklyGrid =
  document.getElementById(
    "weeklyGrid"
  );

const weeklyDateRange =
  document.getElementById(
    "weeklyDateRange"
  );

const weeklyRoomName =
  document.getElementById(
    "weeklyRoomName"
  );


let weeklyBaseDate =
  new Date();


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


function formatShortDate(date) {

  return `${date.getMonth() + 1}.${date.getDate()}`;

}


function renderWeeklySchedule() {

  if (
    !reservation.center ||
    !reservation.room
  ) {

    weeklySection.style.display =
      "none";

    return;
  }


  weeklySection.style.display =
    "block";


  weeklyRoomName.textContent =
    `${reservation.center} · ${reservation.room}`;


  const start =
    getStartOfWeek(
      weeklyBaseDate
    );


  const end =
    new Date(start);


  end.setDate(
    end.getDate() + 6
  );


  weeklyDateRange.textContent =
    `${start.getFullYear()}년 ${formatShortDate(start)}일 ~ ${formatShortDate(end)}일`;


  loadWeeklyReservations(
    start
  );

}


async function loadWeeklyReservations(
  weekStart
) {

  weeklyGrid.innerHTML = "";


  // 먼저 요일 7개 생성

  const days = [];


  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const date =
      new Date(weekStart);


    date.setDate(
      date.getDate() + i
    );


    days.push(date);


    createWeeklyDay(
      date
    );

  }


  if (
    !reservation.center ||
    !reservation.room
  ) {

    return;

  }


  const weekEnd =
    new Date(weekStart);


  weekEnd.setDate(
    weekEnd.getDate() + 6
  );


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("Reservations")
        .select(
          "date, start_time, end_time, user_name, department, purpose"
        )
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
          getDateString(weekStart)
        )
        .lte(
          "date",
          getDateString(weekEnd)
        )
        .order(
          "start_time",
          {
            ascending: true
          }
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


    reservations.forEach(
      item => {

        const dayIndex =
          days.findIndex(
            date =>
              getDateString(date) ===
              item.date
          );


        if (
          dayIndex === -1
        ) {

          return;

        }


        const dayElement =
          weeklyGrid.children[
            dayIndex
          ];


        const reservationContainer =
          dayElement.querySelector(
            ".weekly-reservations"
          );


        const reservationElement =
          document.createElement(
            "div"
          );


        reservationElement.className =
          "weekly-reservation";


        reservationElement.innerHTML = `

          <span class="weekly-reservation-time">
            ${item.start_time} ~ ${item.end_time}
          </span>

          <span class="weekly-reservation-name">
            ${escapeHtml(item.user_name || "예약자")}
          </span>

          <span class="weekly-reservation-department">
            ${escapeHtml(item.department || "")}
          </span>

          <span class="weekly-reservation-purpose">
            ${escapeHtml(item.purpose || "")}
          </span>

        `;


        reservationContainer
          .appendChild(
            reservationElement
          );


        const emptyMessage =
          reservationContainer.querySelector(
            ".no-reservation"
          );


        if (
          emptyMessage
        ) {

          emptyMessage.remove();

        }

      }
    );


  } catch (error) {

    console.error(
      "주간 예약 처리 오류:",
      error
    );

  }

}


function createWeeklyDay(
  date
) {

  const dayNames = [
    "일",
    "월",
    "화",
    "수",
    "목",
    "금",
    "토"
  ];


  const day =
    date.getDay();


  const dayElement =
    document.createElement(
      "div"
    );


  dayElement.className =
    "weekly-day";


  if (day === 0) {

    dayElement.classList.add(
      "sun"
    );

  }

  if (day === 6) {

    dayElement.classList.add(
      "sat"
    );

  }


  const todayString =
    getDateString(
      today
    );


  if (
    getDateString(date) ===
    todayString
  ) {

    dayElement.classList.add(
      "today"
    );

  }


  dayElement.innerHTML = `

    <div class="weekly-day-header">

      <span class="weekly-day-name">
        ${dayNames[day]}
      </span>

      <span class="weekly-day-date">
        ${date.getDate()}
      </span>

    </div>

    <div class="weekly-reservations">

      <div class="no-reservation">
        예약 없음
      </div>

    </div>

  `;


  weeklyGrid.appendChild(
    dayElement
  );

}


// 이전 주

document
  .getElementById("prevWeek")
  .addEventListener(
    "click",
    () => {

      weeklyBaseDate.setDate(
        weeklyBaseDate.getDate() - 7
      );


      renderWeeklySchedule();

    }
  );


// 다음 주

document
  .getElementById("nextWeek")
  .addEventListener(
    "click",
    () => {

      weeklyBaseDate.setDate(
        weeklyBaseDate.getDate() + 7
      );


      renderWeeklySchedule();

    }
  );


// 이번 주

document
  .getElementById("thisWeek")
  .addEventListener(
    "click",
    () => {

      weeklyBaseDate =
        new Date();

      renderWeeklySchedule();

    }
  );


// =====================================================
// HTML 문자 안전 처리
// =====================================================

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// =====================================================
// 예약자 정보 페이지
// =====================================================

document
  .getElementById("nextButton")
  .addEventListener(
    "click",
    () => {

      showPage(userPage);

    }
  );


document
  .getElementById("checkReservation")
  .addEventListener(
    "click",
    () => {

      const name =
        document
          .getElementById("userName")
          .value
          .trim();


      const department =
        document
          .getElementById("department")
          .value
          .trim();


      const phone =
        document
          .getElementById("phone")
          .value
          .trim();


      const purpose =
        document
          .getElementById("purpose")
          .value
          .trim();


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


      reservation.userName =
        name;

      reservation.department =
        department;

      reservation.phone =
        phone;

      reservation.purpose =
        purpose;


      updateConfirmation();

      showPage(confirmPage);

    }
  );


// =====================================================
// 확인 페이지
// =====================================================

function updateConfirmation() {

  document.getElementById(
    "confirmCenter"
  ).textContent =
    reservation.center;


  document.getElementById(
    "confirmRoom"
  ).textContent =
    reservation.room;


  document.getElementById(
    "confirmDate"
  ).textContent =
    formatDate(
      reservation.date
    );


  document.getElementById(
    "confirmTime"
  ).textContent =
    `${reservation.startTime} ~ ${reservation.endTime}`;


  document.getElementById(
    "confirmPeople"
  ).textContent =
    `${reservation.people}명`;


  document.getElementById(
    "confirmName"
  ).textContent =
    reservation.userName;


  document.getElementById(
    "confirmDepartment"
  ).textContent =
    reservation.department;


  document.getElementById(
    "confirmPhone"
  ).textContent =
    reservation.phone;


  document.getElementById(
    "confirmPurpose"
  ).textContent =
    reservation.purpose;

}


// =====================================================
// 날짜 표시
// =====================================================

function formatDate(
  dateString
) {

  const [
    year,
    month,
    day
  ] =
    dateString.split("-");


  return `${year}년 ${Number(month)}월 ${Number(day)}일`;

}


// =====================================================
// 이전
// =====================================================

document
  .getElementById("backToReservation")
  .addEventListener(
    "click",
    () => {

      showPage(
        reservationPage
      );

    }
  );


document
  .getElementById("backToUser")
  .addEventListener(
    "click",
    () => {

      showPage(
        userPage
      );

    }
  );


// =====================================================
// 예약 저장
// =====================================================

document
  .getElementById("reserveButton")
  .addEventListener(
    "click",
    async () => {

      const reserveButton =
        document.getElementById(
          "reserveButton"
        );


      reserveButton.disabled =
        true;


      reserveButton.textContent =
        "예약 저장 중...";


      try {

        const {
          data,
          error
        } =
          await supabaseClient
            .from("Reservations")
            .insert({

              center:
                reservation.center,

              room:
                reservation.room,

              date:
                reservation.date,

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

              phone:
                reservation.phone,

              purpose:
                reservation.purpose

            })
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


          reserveButton.disabled =
            false;

          reserveButton.textContent =
            "예약 신청하기";


          return;

        }


        const summary = `

          <strong>
            ${escapeHtml(reservation.center)}
            ·
            ${escapeHtml(reservation.room)}
          </strong>

          <br>

          ${formatDate(reservation.date)}

          <br>

          ${reservation.startTime}
          ~
          ${reservation.endTime}

          <br>

          ${reservation.people}명

          <br><br>

          예약자 :
          ${escapeHtml(reservation.userName)}

          <br>

          부서 :
          ${escapeHtml(reservation.department)}

        `;


        document.getElementById(
          "completeSummary"
        ).innerHTML =
          summary;


        showPage(
          completePage
        );


      } catch (error) {

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


        reserveButton.disabled =
          false;

        reserveButton.textContent =
          "예약 신청하기";

      }

    }
  );


// =====================================================
// 처음으로
// =====================================================

document
  .getElementById("homeButton")
  .addEventListener(
    "click",
    () => {

      location.reload();

    }
  );


// =====================================================
// 로고
// =====================================================

document
  .getElementById("logoHome")
  .addEventListener(
    "click",
    () => {

      showPage(
        reservationPage
      );

    }
  );


// =====================================================
// 초기화
// =====================================================

renderTimeSlots();

updateDuration();

updateQuickTime();

updatePeople();

validateReservation();
