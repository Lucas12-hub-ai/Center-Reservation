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
// 예약 데이터
// ==========================================

const reservation = {
  center: "",
  capacity: 0,
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

    document.getElementById("capacityText").textContent =
      `${reservation.center}은 최대 ${reservation.capacity}명까지 이용할 수 있습니다.`;

    document.getElementById("quickCenter").textContent = reservation.center;

    if (reservation.people > reservation.capacity) {
      reservation.people = reservation.capacity;
      updatePeople();
    }

    validateReservation();
  });
});

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
      renderStartTimes();
      renderEndTimes();
      updateDuration();

      document.getElementById("startTimeValue").textContent = "시작시간 선택";
      document.getElementById("endTimeValue").textContent = "종료시간 선택";

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
// 드롭다운 요소
// ==========================================

const startTimeButton = document.getElementById("startTimeButton");
const endTimeButton = document.getElementById("endTimeButton");
const startTimeMenu = document.getElementById("startTimeMenu");
const endTimeMenu = document.getElementById("endTimeMenu");

// ==========================================
// 시작시간 메뉴
// ==========================================

function renderStartTimes() {
  startTimeMenu.innerHTML = "";

  allTimes.forEach(time => {
    // 00:00은 시작시간에서 제외
    if (time === "00:00") return;

    const option = document.createElement("button");
    option.type = "button";
    option.className = "time-option";
    option.innerHTML = `<span>${time}</span><span class="check">✓</span>`;

    if (reservation.startTime === time) {
      option.classList.add("selected");
    }

    option.addEventListener("click", () => {
      reservation.startTime = time;
      // 시작시간이 변경되면 종료시간 초기화
      reservation.endTime = "";

      document.getElementById("startTimeValue").textContent = time;
      document.getElementById("endTimeValue").textContent = "종료시간 선택";

      closeDropdowns();
      renderStartTimes();
      renderEndTimes();
      updateQuickTime();
      updateDuration();
      validateReservation();
    });

    startTimeMenu.appendChild(option);
  });
}

// ==========================================
// 종료시간 메뉴
// ==========================================

function renderEndTimes() {
  endTimeMenu.innerHTML = "";

  allTimes.forEach(time => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "time-option";
    option.innerHTML = `<span>${time}</span><span class="check">✓</span>`;

    // 시작시간이 없으면 모든 종료시간 비활성화
    if (!reservation.startTime) {
      option.classList.add("disabled");
      option.disabled = true;
      endTimeMenu.appendChild(option);
      return;
    }

    const startMinutes = timeToMinutes(reservation.startTime);
    const endMinutes = timeToMinutes(time);

    // 시작시간보다 같거나 이르면 선택 불가능
    if (endMinutes <= startMinutes) {
      option.classList.add("disabled");
      option.disabled = true;
    }

    if (reservation.endTime === time) {
      option.classList.add("selected");
    }

    if (!option.disabled) {
      option.addEventListener("click", () => {
        reservation.endTime = time;
        document.getElementById("endTimeValue").textContent = time;

        closeDropdowns();
        renderEndTimes();
        updateQuickTime();
        updateDuration();
        validateReservation();
      });
    }

    endTimeMenu.appendChild(option);
  });
}

// ==========================================
// 드롭다운 열기 / 닫기
// ==========================================

startTimeButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = startTimeMenu.classList.contains("show");
  closeDropdowns();
  if (!isOpen) {
    startTimeMenu.classList.add("show");
    startTimeButton.classList.add("open");
  }
});

endTimeButton.addEventListener("click", (event) => {
  event.stopPropagation();
  const isOpen = endTimeMenu.classList.contains("show");
  closeDropdowns();
  if (!isOpen) {
    endTimeMenu.classList.add("show");
    endTimeButton.classList.add("open");
  }
});

function closeDropdowns() {
  startTimeMenu.classList.remove("show");
  endTimeMenu.classList.remove("show");
  startTimeButton.classList.remove("open");
  endTimeButton.classList.remove("open");
}

// 화면 다른 곳 클릭하면 닫기
document.addEventListener("click", () => {
  closeDropdowns();
});

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
renderStartTimes();
renderEndTimes();
updateDuration();

// ==========================================
// 인원
// ==========================================

const peopleCount = document.getElementById("peopleCount");

function updatePeople() {
  peopleCount.textContent = reservation.people;
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

updatePeople();

// ==========================================
// 예약 가능 여부
// ==========================================

function validateReservation() {
  const nextButton = document.getElementById("nextButton");

  const complete =
    reservation.center &&
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
    <strong>${reservation.center}</strong><br>
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
