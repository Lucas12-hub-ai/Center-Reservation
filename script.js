// ==========================================
// 센터 설정
// ==========================================

const centers = {
  "서교1센터": { capacity: 50, open: "06:00", close: "24:00" },
  "서교2센터": { capacity: 55, open: "06:00", close: "24:00" },
  "명동센터": { capacity: 100, open: "06:00", close: "24:00" },
  "합정역센터": { capacity: 100, open: "06:00", close: "24:00" }
};

// ==========================================
// 센터별 강의실 / 상담실
// ==========================================

const roomsByCenter = {
  "서교1센터": ["강의실1", "강의실2", "상담실1", "상담실2"],
  "서교2센터": ["강의실", "상담실"],
  "명동센터": ["강의실", "상담실1", "상담실2"],
  "합정역센터": ["강의실", "상담실"]
};

// ==========================================
// 예약 데이터
// ==========================================

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

// ==========================================
// 페이지
// ==========================================

const reservationPage = document.getElementById("reservationPage");
const userPage = document.getElementById("userPage");
const confirmPage = document.getElementById("confirmPage");
const completePage = document.getElementById("completePage");

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  page.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================
// 센터 선택
// ==========================================

const centerOptions = document.querySelectorAll(".center-option");

centerOptions.forEach(option => {
  option.addEventListener("click", () => {
    centerOptions.forEach(item => item.classList.remove("selected"));
    option.classList.add("selected");

    reservation.center = option.dataset.center;
    reservation.capacity = Number(option.dataset.capacity);
    reservation.room = ""; // 센터가 바뀌면 공간 선택은 초기화
    reservation.startTime = ""; // 센터마다 운영시간이 다르므로 시간도 초기화
    reservation.endTime = "";

    document.getElementById("capacityText").textContent =
      `${reservation.center}은 최대 ${reservation.capacity}명까지 이용할 수 있습니다.`;

    document.getElementById("quickCenter").textContent = reservation.center;
    document.getElementById("quickRoom").textContent = "선택하기";

    if (reservation.people > reservation.capacity) {
      reservation.people = reservation.capacity;
      updatePeople();
    }

    renderRooms();
    renderTimeSlots();
    updateDuration();
    updateQuickTime();
    validateReservation();
  });
});

// ==========================================
// 공간 (강의실 / 상담실) 선택
// ==========================================

const roomSection = document.getElementById("roomSection");
const roomGrid = document.getElementById("roomGrid");

function renderRooms() {
  roomGrid.innerHTML = "";

  const rooms = roomsByCenter[reservation.center] || [];

  if (rooms.length === 0) {
    roomSection.style.display = "none";
    return;
  }

  roomSection.style.display = "block";

  rooms.forEach(room => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-option";
    button.textContent = room;

    if (reservation.room === room) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      reservation.room = room;

      document.getElementById("quickRoom").textContent = room;

      renderRooms();
      validateReservation();
    });

    roomGrid.appendChild(button);
  });
}

// ==========================================
// 달력
// ==========================================

const calendarDays = document.getElementById("calendarDays");
const monthTitle = document.getElementById("monthTitle");

let currentDate = new Date();
const today = new Date();

function renderCalendar() {
  calendarDays.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.textContent = `${year}.${String(month + 1).padStart(2, "0")}`;

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    calendarDays.appendChild(empty);
  }

  for (let day = 1; day <= lastDate; day++) {
    const button = document.createElement("button");
    button.textContent = day;

    const dateObject = new Date(year, month, day);
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (dateObject < todayOnly) {
      button.classList.add("disabled");
      calendarDays.appendChild(button);
      continue;
    }

    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
      button.classList.add("today");
    }

    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (reservation.date === dateString) {
      button.classList.add("selected");
    }

    button.addEventListener("click", () => {
      reservation.date = dateString;

      // 날짜가 변경되면 시간 초기화
      reservation.startTime = "";
      reservation.endTime = "";

      renderCalendar();
      renderTimeSlots();
      updateDuration();

      document.getElementById("quickDate").textContent = `${year}년 ${month + 1}월 ${day}일`;

      updateQuickTime();
      validateReservation();
    });

    calendarDays.appendChild(button);
  }
}

document.getElementById("prevMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

renderCalendar();

// ==========================================
// 시간 목록 생성 (30분 단위)
// ==========================================

function createTimeList() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      times.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return times;
}

const allTimes = createTimeList();

function timeToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

// ==========================================
// 시간 슬롯 (가로 30분 단위)
// ==========================================

const timeSlotNotice = document.getElementById("timeSlotNotice");
const timeSlotWrapperOuter = document.getElementById("timeSlotWrapperOuter");
const timeSlotWrapper = document.getElementById("timeSlotWrapper");
const timeSlotGrid = document.getElementById("timeSlotGrid");

// ==========================================
// 예약 마감(이미 예약된) 시간 - 테스트용 데이터
// ==========================================
// 실제로는 서버/DB에서 그 센터·그 날짜에 이미 예약된 시간을
// 불러와서 채워야 해요. 지금은 테스트용으로 직접 값을 넣어볼 수 있어요.
// key 형식: "센터명_YYYY-MM-DD" → 예약 마감된 시작시간 배열
//
// 예시)
// const bookedSlots = {
//   "명동센터_2026-08-05": ["09:00", "09:30", "13:00"]
// };

const bookedSlots = {};

function isBooked(time) {
  const key = `${reservation.center}_${reservation.date}`;
  return (bookedSlots[key] || []).includes(time);
}

function generateSlots(open, close) {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);

  const startMinutes = oh * 60 + om;
  const endMinutes = ch * 60 + cm;

  const slots = [];

  for (let m = startMinutes; m < endMinutes; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }

  return slots;
}

function addThirtyMinutes(time) {
  const minutes = timeToMinutes(time) + 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function renderTimeSlots() {
  timeSlotGrid.innerHTML = "";

  // 센터를 선택하지 않았으면 안내 문구만 표시
  if (!reservation.center) {
    timeSlotNotice.style.display = "block";
    timeSlotWrapperOuter.style.display = "none";
    return;
  }

  timeSlotNotice.style.display = "none";
  timeSlotWrapperOuter.style.display = "flex";

  const center = centers[reservation.center];
  const slots = generateSlots(center.open, center.close);

  const startMinutes = reservation.startTime ? timeToMinutes(reservation.startTime) : null;
  const endMinutes = reservation.endTime ? timeToMinutes(reservation.endTime) : null;

  slots.forEach(time => {
    const minutes = timeToMinutes(time);
    const isHourMark = minutes % 60 === 0;
    const booked = isBooked(time);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-slot";
    button.title = time;

    if (isHourMark) {
      button.innerHTML = `<span class="slot-label">${String(Math.floor(minutes / 60)).padStart(2, "0")}</span>`;
    }

    if (booked) {
      button.classList.add("booked");
      button.disabled = true;
      timeSlotGrid.appendChild(button);
      return;
    }

    if (startMinutes !== null && endMinutes !== null && minutes >= startMinutes && minutes < endMinutes) {
      button.classList.add("selected");
    } else if (startMinutes !== null && endMinutes === null && minutes === startMinutes) {
      button.classList.add("selected", "start-only");
    }

    button.addEventListener("click", () => handleSlotClick(time));

    timeSlotGrid.appendChild(button);
  });
}

function handleSlotClick(time) {
  const clickedMinutes = timeToMinutes(time);

  if (!reservation.startTime || reservation.endTime) {
    // 새로 시작 (아직 시작시간이 없거나, 이미 완성된 선택이 있으면 새로 시작)
    reservation.startTime = time;
    reservation.endTime = "";
  } else {
    const startMinutes = timeToMinutes(reservation.startTime);

    if (clickedMinutes <= startMinutes) {
      // 시작시간과 같거나 이전 칸을 누르면 새로 시작
      reservation.startTime = time;
      reservation.endTime = "";
    } else {
      const candidateEnd = addThirtyMinutes(time);

      if (hasBookedBetween(reservation.startTime, candidateEnd)) {
        alert("선택한 구간 중간에 이미 예약이 있어요. 다른 시간을 선택해주세요.");
        return;
      }

      reservation.endTime = candidateEnd;
    }
  }

  renderTimeSlots();
  updateDuration();
  updateQuickTime();
  validateReservation();
}

function hasBookedBetween(startTime, endTime) {
  const center = centers[reservation.center];
  const slots = generateSlots(center.open, center.close);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return slots.some(time => {
    const minutes = timeToMinutes(time);
    return minutes >= startMinutes && minutes < endMinutes && isBooked(time);
  });
}

// ==========================================
// 총 이용시간 계산
// ==========================================

function updateDuration() {
  const durationDisplay = document.getElementById("durationDisplay");
  const durationText = durationDisplay.querySelector("strong");

  if (!reservation.startTime || !reservation.endTime) {
    durationText.textContent = "선택해주세요";
    return;
  }

  const start = timeToMinutes(reservation.startTime);
  const end = timeToMinutes(reservation.endTime);
  let difference = end - start;

  if (difference <= 0) {
    durationText.textContent = "선택해주세요";
    return;
  }

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  let result = "";
  if (hours > 0) result += `${hours}시간`;
  if (minutes > 0) {
    if (result) result += " ";
    result += `${minutes}분`;
  }

  durationText.textContent = result;
}

// ==========================================
// 빠른 시간 표시
// ==========================================

function updateQuickTime() {
  const quickTime = document.getElementById("quickTime");

  if (reservation.startTime && reservation.endTime) {
    quickTime.textContent = `${reservation.startTime} ~ ${reservation.endTime}`;
    return;
  }

  if (reservation.startTime) {
    quickTime.textContent = `${reservation.startTime} ~`;
    return;
  }

  quickTime.textContent = "선택하기";
}

// 초기화
renderTimeSlots();
updateDuration();

// 좌우 화살표로 시간슬롯 넘기기
document.getElementById("prevSlot").addEventListener("click", () => {
  timeSlotWrapper.scrollBy({ left: -156, behavior: "smooth" }); // 6칸(3시간)씩 이동
});

document.getElementById("nextSlot").addEventListener("click", () => {
  timeSlotWrapper.scrollBy({ left: 156, behavior: "smooth" });
});

// ==========================================
// 인원
// ==========================================

const peopleCount = document.getElementById("peopleCount");

function updatePeople() {
  peopleCount.value = reservation.people;
  document.getElementById("quickPeople").textContent = `${reservation.people}명`;
}

document.getElementById("minusPeople").addEventListener("click", () => {
  if (reservation.people > 1) {
    reservation.people--;
    updatePeople();
  }
});

document.getElementById("plusPeople").addEventListener("click", () => {
  if (reservation.capacity && reservation.people < reservation.capacity) {
    reservation.people++;
    updatePeople();
  }
});

// 숫자를 직접 입력했을 때 (입력 중에는 그대로 두고, 포커스가 벗어나면 검증)
peopleCount.addEventListener("change", () => {
  let value = parseInt(peopleCount.value, 10);

  if (isNaN(value) || value < 1) {
    value = 1;
  }

  if (reservation.capacity && value > reservation.capacity) {
    value = reservation.capacity;
    alert(`${reservation.center}은 최대 ${reservation.capacity}명까지 이용할 수 있습니다.`);
  }

  reservation.people = value;
  updatePeople();
});

updatePeople();

// ==========================================
// 예약 가능 여부
// ==========================================

function validateReservation() {
  const nextButton = document.getElementById("nextButton");

  const complete =
    reservation.center &&
    reservation.room &&
    reservation.date &&
    reservation.startTime &&
    reservation.endTime &&
    reservation.people > 0;

  nextButton.disabled = !complete;
}

validateReservation();

// ==========================================
// 예약자 정보 페이지
// ==========================================

document.getElementById("nextButton").addEventListener("click", () => {
  showPage(userPage);
});

// ==========================================
// 예약자 정보 확인
// ==========================================

document.getElementById("checkReservation").addEventListener("click", () => {
  const name = document.getElementById("userName").value.trim();
  const department = document.getElementById("department").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const purpose = document.getElementById("purpose").value.trim();

  if (!name) { alert("예약자 이름을 입력해주세요."); return; }
  if (!department) { alert("부서를 입력해주세요."); return; }
  if (!phone) { alert("연락처를 입력해주세요."); return; }
  if (!purpose) { alert("사용 목적을 입력해주세요."); return; }

  reservation.userName = name;
  reservation.department = department;
  reservation.phone = phone;
  reservation.purpose = purpose;

  updateConfirmation();
  showPage(confirmPage);
});

// ==========================================
// 확인 페이지
// ==========================================

function updateConfirmation() {
  document.getElementById("confirmCenter").textContent = reservation.center;
  document.getElementById("confirmRoom").textContent = reservation.room;
  document.getElementById("confirmDate").textContent = formatDate(reservation.date);
  document.getElementById("confirmTime").textContent = `${reservation.startTime} ~ ${reservation.endTime}`;
  document.getElementById("confirmPeople").textContent = `${reservation.people}명`;
  document.getElementById("confirmName").textContent = reservation.userName;
  document.getElementById("confirmDepartment").textContent = reservation.department;
  document.getElementById("confirmPhone").textContent = reservation.phone;
  document.getElementById("confirmPurpose").textContent = reservation.purpose;
}

// ==========================================
// 날짜 표시
// ==========================================

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

// ==========================================
// 이전
// ==========================================

document.getElementById("backToReservation").addEventListener("click", () => {
  showPage(reservationPage);
});

document.getElementById("backToUser").addEventListener("click", () => {
  showPage(userPage);
});

// ==========================================
// 예약 신청
// ==========================================

document.getElementById("reserveButton").addEventListener("click", () => {
  const summary = `
    <strong>${reservation.center} · ${reservation.room}</strong><br>
    ${formatDate(reservation.date)}<br>
    ${reservation.startTime} ~ ${reservation.endTime}<br>
    ${reservation.people}명<br><br>
    예약자 : ${reservation.userName}<br>
    부서 : ${reservation.department}
  `;

  document.getElementById("completeSummary").innerHTML = summary;
  showPage(completePage);
});

// ==========================================
// 처음으로
// ==========================================

document.getElementById("homeButton").addEventListener("click", () => {
  location.reload();
});

// ==========================================
// 로고 클릭 → 첫 페이지로 이동
// ==========================================

document.getElementById("logoHome").addEventListener("click", () => {
  showPage(reservationPage);
});
