var CALENDAR_SAMPLE_ROOMS = [
  { id: 1, name: '상도동 햇살빌라', address: '서울 동작구 상도로 123', visitDate: '2026-11-25' },
  { id: 2, name: '봉천동 청운하우스', address: '서울 관악구 청룡길 45', visitDate: '2026-11-23' },
  { id: 3, name: '흑석동 그린원룸', address: '서울 동작구 흑석로 77', visitDate: '2026-11-26' },
  { id: 4, name: '대방동 미소빌', address: '서울 영등포구 여의대방로 12', visitDate: '2026-11-28' }
];

var WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

var calendarState = (function () {
  var now = new Date();
  var todayStr = formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    todayDate: todayStr,
    selectedDate: '2026-11-25' === todayStr || (now.getFullYear() === 2026 && now.getMonth() + 1 === 11)
      ? '2026-11-25'
      : todayStr
  };
})();

function padTwo(num) {
  return num < 10 ? '0' + num : String(num);
}

function formatDateKey(year, month, day) {
  return year + '-' + padTwo(month) + '-' + padTwo(day);
}

function getCalendarRooms() {
  if (typeof loadRooms === 'function') {
    var fromCommon = loadRooms();
    if (Array.isArray(fromCommon)) {
      return fromCommon;
    }
  }
  try {
    var raw = localStorage.getItem('rooms');
    if (raw !== null) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // localStorage 파싱 실패 시 기본 예시 목록 사용
  }
  return CALENDAR_SAMPLE_ROOMS;
}

function getRoomsByMonth(year, month) {
  var prefix = year + '-' + padTwo(month) + '-';
  return getCalendarRooms()
    .filter(function (room) {
      return room && typeof room.visitDate === 'string' && room.visitDate.indexOf(prefix) === 0;
    })
    .sort(function (a, b) {
      return a.visitDate.localeCompare(b.visitDate);
    });
}

function renderCalendar(year, month) {
  // 지정된 연도(year)와 월(month)의 7열 달력 날짜, 오늘(today), 방문일(has-visit)을 그린다.
  calendarState.year = year;
  calendarState.month = month;

  var titleEl = document.querySelector('.calendar-month-title');
  var daysEl = document.querySelector('.calendar-days');
  if (!daysEl) {
    return;
  }

  if (titleEl) {
    titleEl.textContent = year + '년 ' + month + '월';
  }

  var monthRooms = getRoomsByMonth(year, month);
  var visitDateMap = {};
  monthRooms.forEach(function (room) {
    visitDateMap[room.visitDate] = true;
  });

  var firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  var lastDateOfMonth = new Date(year, month, 0).getDate();
  var prevMonthYear = month === 1 ? year - 1 : year;
  var prevMonth = month === 1 ? 12 : month - 1;
  var lastDateOfPrevMonth = new Date(prevMonthYear, prevMonth, 0).getDate();

  var totalCells = Math.ceil((firstDayOfWeek + lastDateOfMonth) / 7) * 7;
  var fragment = document.createDocumentFragment();

  for (var i = 0; i < totalCells; i++) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calendar-day-btn';

    var numSpan = document.createElement('span');
    numSpan.className = 'calendar-day-num';

    var dotSpan = document.createElement('span');
    dotSpan.className = 'calendar-dot';

    if (i < firstDayOfWeek) {
      var prevDay = lastDateOfPrevMonth - firstDayOfWeek + 1 + i;
      btn.classList.add('is-outside');
      btn.disabled = true;
      numSpan.textContent = String(prevDay);
    } else if (i >= firstDayOfWeek + lastDateOfMonth) {
      var nextDay = i - (firstDayOfWeek + lastDateOfMonth) + 1;
      btn.classList.add('is-outside');
      btn.disabled = true;
      numSpan.textContent = String(nextDay);
    } else {
      var day = i - firstDayOfWeek + 1;
      var dateStr = formatDateKey(year, month, day);
      numSpan.textContent = String(day);
      btn.setAttribute('data-date', dateStr);

      if (dateStr === calendarState.todayDate) {
        btn.classList.add('today');
      }
      if (visitDateMap[dateStr]) {
        btn.classList.add('has-visit');
      }
      if (dateStr === calendarState.selectedDate) {
        btn.classList.add('is-selected');
      }

      btn.addEventListener('click', (function (targetDate) {
        return function () {
          showRoomByDate(targetDate);
        };
      })(dateStr));
    }

    btn.appendChild(numSpan);
    btn.appendChild(dotSpan);
    fragment.appendChild(btn);
  }

  daysEl.innerHTML = '';
  daysEl.appendChild(fragment);
}

function showRoomByDate(date) {
  // 선택한 날짜(date)를 강조하고 해당 날짜의 방문 일정을 목록에서 강조 표시한다.
  calendarState.selectedDate = date;

  var dayButtons = document.querySelectorAll('.calendar-day-btn[data-date]');
  dayButtons.forEach(function (btn) {
    if (btn.getAttribute('data-date') === date) {
      btn.classList.add('is-selected');
    } else {
      btn.classList.remove('is-selected');
    }
  });

  var listItems = document.querySelectorAll('.visit-list-item[data-date]');
  listItems.forEach(function (item) {
    if (item.getAttribute('data-date') === date) {
      item.classList.add('is-selected');
    } else {
      item.classList.remove('is-selected');
    }
  });
}

function moveMonth(step) {
  // 이전 달(-1) 또는 다음 달(+1)로 이동하며 달력과 월별 방문 일정 목록을 함께 갱신한다.
  var nextMonth = calendarState.month + step;
  var nextYear = calendarState.year;

  if (nextMonth < 1) {
    nextMonth = 12;
    nextYear -= 1;
  } else if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  var monthPrefix = nextYear + '-' + padTwo(nextMonth) + '-';
  if (calendarState.selectedDate && calendarState.selectedDate.indexOf(monthPrefix) !== 0) {
    calendarState.selectedDate = '';
  }

  renderCalendar(nextYear, nextMonth);
  renderVisitList(nextYear, nextMonth);
}

function renderVisitList(year, month) {
  // 해당 연도(year)와 월(month)의 전체 방문 일정을 날짜순으로 달력 아래/오른쪽에 표시한다.
  var panelEl = document.querySelector('.visit-list-panel');
  if (!panelEl) {
    return;
  }

  var headingEl = panelEl.querySelector('.visit-list-heading');
  var itemsEl = panelEl.querySelector('.visit-list-items');
  var emptyEl = panelEl.querySelector('.calendar-empty-text');
  var monthRooms = getRoomsByMonth(year, month);

  if (headingEl) {
    headingEl.textContent = month + '월 방문 일정 ' + monthRooms.length + '건';
  }

  if (!itemsEl) {
    itemsEl = document.createElement('div');
    itemsEl.className = 'visit-list-items';
    panelEl.appendChild(itemsEl);
  }

  itemsEl.innerHTML = '';

  if (monthRooms.length === 0) {
    itemsEl.style.display = 'none';
    if (!emptyEl) {
      emptyEl = document.createElement('p');
      emptyEl.className = 'calendar-empty-text';
      emptyEl.textContent = '이번 달 방문 일정이 없어요.';
      panelEl.appendChild(emptyEl);
    } else {
      emptyEl.style.display = 'block';
    }
    return;
  }

  itemsEl.style.display = 'flex';
  if (emptyEl) {
    emptyEl.style.display = 'none';
  }

  var fragment = document.createDocumentFragment();
  monthRooms.forEach(function (room) {
    var parts = room.visitDate.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    var weekday = WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];

    var link = document.createElement('a');
    link.href = 'register.html?id=' + encodeURIComponent(room.id);
    link.className = 'visit-list-item';
    link.setAttribute('data-date', room.visitDate);
    if (room.visitDate === calendarState.selectedDate) {
      link.classList.add('is-selected');
    }

    var dateRow = document.createElement('div');
    dateRow.className = 'visit-list-date-row';

    var dateSpan = document.createElement('span');
    dateSpan.className = 'visit-list-date';
    if (room.visitDate >= calendarState.todayDate) {
      dateSpan.classList.add('is-upcoming');
    }
    dateSpan.textContent = m + '월 ' + d + '일 (' + weekday + ')';
    dateRow.appendChild(dateSpan);

    if (room.visitDate === calendarState.todayDate) {
      var todaySpan = document.createElement('span');
      todaySpan.className = 'visit-today-tag';
      todaySpan.textContent = '오늘';
      dateRow.appendChild(todaySpan);
    }

    var nameHeading = document.createElement('h3');
    nameHeading.className = 'visit-list-name';
    nameHeading.textContent = room.name || '이름 없는 매물';

    var addressPara = document.createElement('p');
    addressPara.className = 'visit-list-address';
    addressPara.textContent = room.address || '';

    link.appendChild(dateRow);
    link.appendChild(nameHeading);
    link.appendChild(addressPara);
    fragment.appendChild(link);
  });

  itemsEl.appendChild(fragment);
}

document.addEventListener('DOMContentLoaded', function () {
  renderCalendar(calendarState.year, calendarState.month);
  renderVisitList(calendarState.year, calendarState.month);
});
