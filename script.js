// ==========================================
// 센터 설정
// ==========================================
//
// 나중에 센터별 운영시간이나 최대인원을
// 여기에서 쉽게 수정할 수 있습니다.
//

const centers = {

  "서교1센터": {
    capacity: 10,
    open: "06:00",
    close: "24:00"
  },

  "서교2센터": {
    capacity: 15,
    open: "06:00",
    close: "24:00"
  },

  "명동센터": {
    capacity: 20,
    open: "06:00",
    close: "24:00"
  },

  "합정역센터": {
    capacity: 30,
    open: "06:00",
    close: "24:00"
  }

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

const reservationPage =
  document.getElementById("reservationPage");

const userPage =
  document.getElementById("userPage");

const confirmPage =
  document.getElementById("confirmPage");

const completePage =
  document.getElementById("completePage");


function showPage(page) {

  document.querySelectorAll(".page")
    .forEach(p =>
      p.classList.remove("active")
    );

  page.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// ==========================================
// 센터 선택
// ==========================================

const centerOptions =
  document.querySelectorAll(".center-option");


centerOptions.forEach(option => {

  option.addEventListener("click", () => {

    centerOptions.forEach(item =>
      item.classList.remove("selected")
    );

    option.classList.add("selected");


    reservation.center =
      option.dataset.center;


    reservation.capacity =
      Number(option.dataset.capacity);


    document.getElementById(
      "capacityText"
    ).textContent =
      `${reservation.center}은 최대 ${reservation.capacity}명까지 이용할 수 있습니다.`;


    document.getElementById(
      "quickCenter"
    ).textContent =
      reservation.center;


    // 인원이 최대인원을 넘는 경우
    if (
      reservation.people >
      reservation.capacity
    ) {

      reservation.people =
        reservation.capacity;

      updatePeople();

    }


    validateReservation();

  });

});


// ==========================================
// 달력
// ==========================================

const calendarDays =
  document.getElementById("calendarDays");

const monthTitle =
  document.getElementById("monthTitle");


let currentDate =
  new Date();


const today =
  new Date();


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


  // 빈 칸
  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    const empty =
      document.createElement("div");

    calendarDays.appendChild(empty);

  }


  // 날짜
  for (
    let day = 1;
    day <= lastDate;
    day++
  ) {

    const button =
      document.createElement("button");


    button.textContent =
      day;


    const dateObject =
      new Date(
        year,
        month,
        day
      );


    const todayOnly =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );


    // 과거
    if (
      dateObject <
      todayOnly
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


    const dateString =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;


    if (
      reservation.date ===
      dateString
    ) {

      button.classList.add(
        "selected"
      );

    }


    button.addEventListener(
      "click",
      () => {

        reservation.date =
          dateString;


        // 날짜가 변경되면 시간 초기화
        reservation.startTime = "";

        reservation.endTime = "";


        renderCalendar();

        renderTimes();


        document.getElementById(
          "quickDate"
        ).textContent =
          `${year}년 ${month + 1}월 ${day}일`;


        validateReservation();

      }
    );


    calendarDays.appendChild(
      button
    );

  }

}


document.getElementById(
  "prevMonth"
).addEventListener(
  "click",
  () => {

    currentDate.setMonth(
      currentDate.getMonth() - 1
    );

    renderCalendar();

  }
);


document.getElementById(
  "nextMonth"
).addEventListener(
  "click",
  () => {

    currentDate.setMonth(
      currentDate.getMonth() + 1
    );

    renderCalendar();

  }
);


renderCalendar();


// ==========================================
// 시간 생성
// ==========================================

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

      const time =
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;


      times.push(time);

    }

  }


  return times;

}


const allTimes =
  createTimeList();


// ==========================================
// 시간 → 분 변환
// ==========================================

function timeToMinutes(time) {

  const [hour, minute] =
    time.split(":").map(Number);

  return hour * 60 + minute;

}


// ==========================================
// 시간 렌더링
// ==========================================

function renderTimes() {

  const startContainer =
    document.getElementById(
      "startTimes"
    );


  const endContainer =
    document.getElementById(
      "endTimes"
    );


  startContainer.innerHTML = "";

  endContainer.innerHTML = "";


  // ==============================
  // 시작시간
  // ==============================

  allTimes.forEach(time => {

    const button =
      document.createElement("button");


    button.className =
      "time-button";


    button.textContent =
      time;


    // 24:00은 종료용
    if (time === "00:00") {

      button.classList.add(
        "disabled"
      );

      button.disabled = true;

      startContainer.appendChild(
        button
      );

      return;

    }


    if (
      reservation.startTime ===
      time
    ) {

      button.classList.add(
        "selected"
      );

    }


    button.addEventListener(
      "click",
      () => {

        reservation.startTime =
          time;


        // 시작시간을 변경하면 종료시간 초기화
        reservation.endTime =
          "";


        document.getElementById(
          "startTimeValue"
        ).textContent =
          time;


        document.getElementById(
          "endTimeValue"
        ).textContent =
          "선택하기";


        renderTimes();


        updateQuickTime();


        validateReservation();

      }
    );


    startContainer.appendChild(
      button
    );

  });


  // ==============================
  // 종료시간
  // ==============================

  allTimes.forEach(time => {

    const button =
      document.createElement("button");


    button.className =
      "time-button";


    button.textContent =
      time;


    // 시작시간을 선택하지 않았으면
    // 종료시간 선택 불가
    if (!reservation.startTime) {

      button.classList.add(
        "disabled"
      );

      button.disabled = true;

      endContainer.appendChild(
        button
      );

      return;

    }


    const startMinutes =
      timeToMinutes(
        reservation.startTime
      );


    const endMinutes =
      timeToMinutes(time);


    // 시작시간보다 같거나 이전
    if (
      endMinutes <=
      startMinutes
    ) {

      button.classList.add(
        "disabled"
      );

      button.disabled = true;

      endContainer.appendChild(
        button
      );

      return;

    }


    if (
      reservation.endTime ===
      time
    ) {

      button.classList.add(
        "selected"
      );

    }


    button.addEventListener(
      "click",
      () => {

        reservation.endTime =
          time;


        document.getElementById(
          "endTimeValue"
        ).textContent =
          time;


        renderTimes();


        updateQuickTime();


        validateReservation();

      }
    );


    endContainer.appendChild(
      button
    );

  });

}


renderTimes();


// ==========================================
// 빠른 시간 표시
// ==========================================

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


// ==========================================
// 인원
// ==========================================

const peopleCount =
  document.getElementById(
    "peopleCount"
  );


function updatePeople() {

  peopleCount.textContent =
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


updatePeople();


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
    reservation.date &&
    reservation.startTime &&
    reservation.endTime &&
    reservation.people > 0;


  nextButton.disabled =
    !complete;

}


validateReservation();


// ==========================================
// 예약자 정보 페이지
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
// 예약자 정보 확인
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


    const phone =
      document.getElementById(
        "phone"
      ).value.trim();


    const purpose =
      document.getElementById(
        "purpose"
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


    showPage(
      confirmPage
    );

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

    showPage(
      reservationPage
    );

  }
);


document.getElementById(
  "backToUser"
).addEventListener(
  "click",
  () => {

    showPage(
      userPage
    );

  }
);


// ==========================================
// 예약 신청
// ==========================================

document.getElementById(
  "reserveButton"
).addEventListener(
  "click",
  () => {

    const summary = `

      <strong>
        ${reservation.center}
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
      ${reservation.userName}

      <br>

      부서 :
      ${reservation.department}

    `;


    document.getElementById(
      "completeSummary"
    ).innerHTML =
      summary;


    showPage(
      completePage
    );

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
