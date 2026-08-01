// ==========================================
// 예약 데이터
// ==========================================

const reservation = {
  center: "",
  capacity: 10,
  date: "",
  time: "",
  duration: 2,
  people: 2
};


// ==========================================
// STEP 이동
// ==========================================

function goToStep(stepNumber) {

  document.querySelectorAll(".reservation-section")
    .forEach(section => {
      section.classList.remove("active-section");
    });

  const target = document.getElementById(
    stepNumber === 5 ? "step5" :
    stepNumber === 6 ? "complete" :
    `step${stepNumber}`
  );

  if (target) {
    target.classList.add("active-section");
  }

  document.querySelectorAll(".step")
    .forEach(step => {
      step.classList.remove("active");
    });

  if (stepNumber <= 4) {
    document.querySelector(
      `.step[data-step="${stepNumber}"]`
    ).classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


// ==========================================
// STEP 1 - 센터
// ==========================================

const centerCards =
  document.querySelectorAll(".center-card");

const next1 =
  document.getElementById("next1");

centerCards.forEach(card => {

  card.addEventListener("click", () => {

    centerCards.forEach(c =>
      c.classList.remove("selected")
    );

    card.classList.add("selected");

    reservation.center =
      card.dataset.center;

    reservation.capacity =
      Number(card.dataset.capacity);

    next1.disabled = false;
  });

});


next1.addEventListener("click", () => {

  document.getElementById("capacityText").textContent =
    `${reservation.center} 이용 가능 인원은 최대 ${reservation.capacity}명입니다.`;

  goToStep(2);

});


// ==========================================
// STEP 2 - 달력
// ==========================================

const calendarDays =
  document.getElementById("calendarDays");

const monthTitle =
  document.getElementById("monthTitle");

let currentDate = new Date();

const today = new Date();

function renderCalendar() {

  calendarDays.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.textContent =
    `${year}.${String(month + 1).padStart(2, "0")}`;

  const firstDay =
    new Date(year, month, 1).getDay();

  const lastDate =
    new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {

    const empty = document.createElement("div");

    calendarDays.appendChild(empty);
  }


  for (let day = 1; day <= lastDate; day++) {

    const button =
      document.createElement("button");

    button.textContent = day;


    const dateObject =
      new Date(year, month, day);


    // 과거 날짜
    if (
      dateObject <
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      )
    ) {

      button.classList.add("disabled");

      calendarDays.appendChild(button);

      continue;
    }


    // 오늘
    if (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    ) {
      button.classList.add("today");
    }


    // 선택된 날짜
    const dateString =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (reservation.date === dateString) {
      button.classList.add("selected");
    }


    button.addEventListener("click", () => {

      reservation.date = dateString;

      renderCalendar();

      document.getElementById(
        "next2"
      ).disabled = false;

      document.getElementById(
        "selectedDateText"
      ).textContent =
        `${year}년 ${month + 1}월 ${day}일`;

    });


    calendarDays.appendChild(button);
  }
}


document.getElementById("prevMonth")
  .addEventListener("click", () => {

    currentDate.setMonth(
      currentDate.getMonth() - 1
    );

    renderCalendar();
  });


document.getElementById("nextMonth")
  .addEventListener("click", () => {

    currentDate.setMonth(
      currentDate.getMonth() + 1
    );

    renderCalendar();
  });


document.getElementById("next2")
  .addEventListener("click", () => {

    generateTimes();

    goToStep(3);

  });


renderCalendar();


// ==========================================
// STEP 3 - 시간
// ==========================================

const morningTimes =
  document.getElementById("morningTimes");

const afternoonTimes =
  document.getElementById("afternoonTimes");


function generateTimes() {

  morningTimes.innerHTML = "";
  afternoonTimes.innerHTML = "";

  const times = [];


  for (
    let hour = 0;
    hour <= 23;
    hour++
  ) {

    for (
      let minute = 0;
      minute < 60;
      minute += 30
    ) {

      if (hour === 0 && minute === 30) continue;

      const h =
        String(hour).padStart(2, "0");

      const m =
        String(minute).padStart(2, "0");

      times.push(`${h}:${m}`);
    }
  }


  times.forEach(time => {

    const button =
      document.createElement("button");

    button.className = "time-button";

    button.textContent = time;


    if (reservation.time === time) {
      button.classList.add("selected");
    }


    button.addEventListener("click", () => {

      document.querySelectorAll(".time-button")
        .forEach(b =>
          b.classList.remove("selected")
        );

      button.classList.add("selected");

      reservation.time = time;

      document.getElementById(
        "next3"
      ).disabled = false;

    });


    const hour =
      Number(time.split(":")[0]);

    if (hour < 12) {
      morningTimes.appendChild(button);
    } else {
      afternoonTimes.appendChild(button);
    }

  });

}


document.querySelectorAll(
  ".duration-buttons button"
).forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(
      ".duration-buttons button"
    ).forEach(b =>
      b.classList.remove("selected")
    );

    button.classList.add("selected");

    reservation.duration =
      Number(button.dataset.duration);

    document.getElementById(
      "durationText"
    ).textContent =
      `${reservation.duration}시간`;

  });

});


document.getElementById("next3")
  .addEventListener("click", () => {

    goToStep(4);

  });


// ==========================================
// STEP 4 - 인원
// ==========================================

const peopleCount =
  document.getElementById("peopleCount");


function updatePeople() {

  peopleCount.textContent =
    reservation.people;

}


document.getElementById("minusPeople")
  .addEventListener("click", () => {

    if (reservation.people > 1) {

      reservation.people--;

      updatePeople();

    }

  });


document.getElementById("plusPeople")
  .addEventListener("click", () => {

    if (
      reservation.people <
      reservation.capacity
    ) {

      reservation.people++;

      updatePeople();

    }

  });


document.getElementById("next4")
  .addEventListener("click", () => {

    document.getElementById(
      "summaryCenter"
    ).textContent =
      reservation.center;


    document.getElementById(
      "summaryDate"
    ).textContent =
      reservation.date;


    document.getElementById(
      "summaryTime"
    ).textContent =
      `${reservation.time} ~ ${calculateEndTime()}`;


    document.getElementById(
      "summaryPeople"
    ).textContent =
      `${reservation.people}명`;


    goToStep(5);

  });


// ==========================================
// 종료시간 계산
// ==========================================

function calculateEndTime() {

  const [hour, minute] =
    reservation.time.split(":").map(Number);

  const totalMinutes =
    hour * 60 +
    minute +
    reservation.duration * 60;

  const endHour =
    Math.floor(totalMinutes / 60) % 24;

  const endMinute =
    totalMinutes % 60;

  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}


// ==========================================
// 이전 버튼
// ==========================================

document.querySelectorAll(".back-button")
  .forEach(button => {

    button.addEventListener("click", () => {

      const backStep =
        Number(button.dataset.back);

      goToStep(backStep);

    });

  });


// ==========================================
// 예약 신청
// ==========================================

document.getElementById("reserveButton")
  .addEventListener("click", () => {

    const summary = `
      <strong>${reservation.center}</strong><br><br>
      ${reservation.date}<br>
      ${reservation.time} ~ ${calculateEndTime()}<br>
      ${reservation.people}명
    `;

    document.getElementById(
      "completeSummary"
    ).innerHTML = summary;

    goToStep(6);

  });


// ==========================================
// 처음으로
// ==========================================

function resetReservation() {

  reservation.center = "";
  reservation.capacity = 10;
  reservation.date = "";
  reservation.time = "";
  reservation.duration = 2;
  reservation.people = 2;

  document.querySelectorAll(".center-card")
    .forEach(c =>
      c.classList.remove("selected")
    );

  document.getElementById(
    "next1"
  ).disabled = true;

  document.getElementById(
    "next2"
  ).disabled = true;

  document.getElementById(
    "next3"
  ).disabled = true;

  document.getElementById(
    "peopleCount"
  ).textContent = "2";

  goToStep(1);

}


document.getElementById("restartButton")
  .addEventListener("click", resetReservation);


document.getElementById("homeButton")
  .addEventListener("click", resetReservation);
