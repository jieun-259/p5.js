var STAR_CATEGORIES = ['채광', '방음', '수압', '청결'];
var MEMO_SELECTED_ROOM_KEY = 'memoSelectedRoomId';

var memoState = {
  roomId: null,
  stars: { 채광: 0, 방음: 0, 수압: 0, 청결: 0 }
};

var memoAutoSaveTimer = null;

function showMemoStatus(message) {
  var statusEl = document.getElementById('memo-save-msg');
  if (!statusEl) {
    return;
  }
  if (message) {
    statusEl.textContent = message;
    statusEl.hidden = false;
  } else {
    statusEl.textContent = '';
    statusEl.hidden = true;
  }
}

function getStoredSelectedRoomId() {
  try {
    return localStorage.getItem(MEMO_SELECTED_ROOM_KEY);
  } catch (e) {
    return null;
  }
}

function setStoredSelectedRoomId(id) {
  try {
    if (id !== null && id !== undefined && String(id) !== '') {
      localStorage.setItem(MEMO_SELECTED_ROOM_KEY, String(id));
    }
  } catch (e) {
    // localStorage 쓰기 제한 시 무시
  }
}

function renderStarsUI() {
  var rows = document.querySelectorAll('.rating-row');
  rows.forEach(function (row) {
    var labelEl = row.querySelector('.rating-label');
    if (!labelEl) {
      return;
    }
    var category = labelEl.textContent.trim();
    var currentVal = Number(memoState.stars[category]) || 0;
    var buttons = row.querySelectorAll('.star-btn');

    buttons.forEach(function (btn, idx) {
      var starValue = idx + 1;
      var filled = starValue <= currentVal;
      btn.classList.toggle('is-filled', filled);
      btn.setAttribute('aria-pressed', filled ? 'true' : 'false');
      btn.onclick = function () {
        setStar(memoState.roomId, category, starValue);
      };
    });
  });

  var avgEl = document.querySelector('.average-score-value');
  if (avgEl) {
    var avg = calcAverage({ stars: memoState.stars });
    avgEl.textContent = avg.toFixed(1) + ' / 5';
  }
}

function persistMemoData(id, text, shouldTrim) {
  var targetId = id !== undefined && id !== null ? id : memoState.roomId;
  if (targetId === null || targetId === undefined) {
    return { ok: false, reason: 'no-target' };
  }

  var memoEl = document.getElementById('room-memo');
  var rawText = typeof text === 'string' ? text : (memoEl ? memoEl.value : '');
  var savedText = shouldTrim ? rawText.trim() : rawText;

  var rooms = loadRooms();
  var updated = false;
  var hasRating = STAR_CATEGORIES.some(function (cat) {
    return (Number(memoState.stars[cat]) || 0) > 0;
  });

  for (var i = 0; i < rooms.length; i++) {
    if (String(rooms[i].id) === String(targetId)) {
      var hasChecklist = rooms[i].checklist && Object.keys(rooms[i].checklist).some(function (k) {
        return Boolean(rooms[i].checklist[k]);
      });

      rooms[i] = Object.assign({}, rooms[i], {
        stars: Object.assign({}, memoState.stars),
        memo: savedText,
        evaluated: Boolean(hasRating || hasChecklist || savedText.trim().length > 0),
        totalScore: null
      });
      updated = true;
      break;
    }
  }

  if (!updated) {
    return { ok: false, reason: 'not-found' };
  }

  if (!saveRooms(rooms)) {
    return { ok: false, reason: 'storage-error' };
  }

  return { ok: true, savedText: savedText };
}

function flushMemoAutoSave() {
  if (memoAutoSaveTimer) {
    clearTimeout(memoAutoSaveTimer);
    memoAutoSaveTimer = null;
  }
  if (memoState.roomId === null || memoState.roomId === undefined) {
    return;
  }
  var memoEl = document.getElementById('room-memo');
  persistMemoData(memoState.roomId, memoEl ? memoEl.value : '', false);
}

function scheduleMemoAutoSave() {
  if (memoAutoSaveTimer) {
    clearTimeout(memoAutoSaveTimer);
  }
  memoAutoSaveTimer = setTimeout(function () {
    memoAutoSaveTimer = null;
    flushMemoAutoSave();
  }, 150);
}

function loadMemoRoom(id) {
  if (memoAutoSaveTimer) {
    clearTimeout(memoAutoSaveTimer);
    memoAutoSaveTimer = null;
  }

  var room = findRoom(id);
  var titleEl = document.querySelector('.room-context-title');
  var subEl = document.querySelector('.room-context-sub');
  var memoEl = document.getElementById('room-memo');

  if (!room) {
    memoState.roomId = null;
    memoState.stars = { 채광: 0, 방음: 0, 수압: 0, 청결: 0 };
    if (titleEl) {
      titleEl.textContent = '등록된 매물이 없어요';
    }
    if (subEl) {
      subEl.textContent = '먼저 매물을 등록해 주세요';
    }
    if (memoEl) {
      memoEl.value = '';
    }
    renderStarsUI();
    return;
  }

  memoState.roomId = room.id;
  memoState.stars = {
    채광: room.stars && Number(room.stars['채광']) ? Number(room.stars['채광']) : 0,
    방음: room.stars && Number(room.stars['방음']) ? Number(room.stars['방음']) : 0,
    수압: room.stars && Number(room.stars['수압']) ? Number(room.stars['수압']) : 0,
    청결: room.stars && Number(room.stars['청결']) ? Number(room.stars['청결']) : 0
  };

  if (titleEl) {
    titleEl.textContent = room.name || '이름 없는 매물';
  }
  if (subEl) {
    var depositStr = (Number(room.deposit) || 0).toLocaleString('ko-KR');
    var rentStr = (Number(room.rent) || 0).toLocaleString('ko-KR');
    var datePart = room.visitDate ? ' · 방문일 ' + room.visitDate : '';
    subEl.textContent = '보증금 ' + depositStr + ' / 월세 ' + rentStr + datePart;
  }
  if (memoEl) {
    memoEl.value = room.memo || '';
  }

  showMemoStatus('');
  renderStarsUI();
}

function initMemoPage() {
  var params = new URLSearchParams(window.location.search);
  var idParam = params.get('id');
  var rooms = loadRooms();
  var selectWrap = document.getElementById('memo-select-wrap');
  var selectEl = document.getElementById('memo-room-select');
  var memoEl = document.getElementById('room-memo');
  var saveBtn = document.getElementById('save-memo-btn');

  if (selectEl) {
    selectEl.innerHTML = '';
    rooms.forEach(function (room) {
      var option = document.createElement('option');
      option.value = String(room.id);
      option.textContent = room.name || '이름 없는 매물';
      selectEl.appendChild(option);
    });
    selectEl.onchange = function () {
      flushMemoAutoSave();
      setStoredSelectedRoomId(this.value);
      loadMemoRoom(this.value);
    };
  }

  if (idParam && findRoom(idParam)) {
    if (selectWrap) {
      selectWrap.style.display = 'none';
    }
    loadMemoRoom(idParam);
  } else {
    if (selectWrap) {
      selectWrap.style.display = rooms.length > 0 ? 'flex' : 'none';
    }
    var rememberedId = getStoredSelectedRoomId();
    var initialRoom = rememberedId ? findRoom(rememberedId) : null;
    var initialId = initialRoom ? initialRoom.id : (rooms.length > 0 ? rooms[0].id : null);

    if (selectEl && initialId !== null) {
      selectEl.value = String(initialId);
    }
    if (initialId !== null) {
      setStoredSelectedRoomId(initialId);
    }
    loadMemoRoom(initialId);
  }

  if (memoEl) {
    memoEl.addEventListener('input', function () {
      showMemoStatus('');
      scheduleMemoAutoSave();
    });
    memoEl.addEventListener('change', function () {
      flushMemoAutoSave();
    });
    memoEl.addEventListener('blur', function () {
      flushMemoAutoSave();
    });
  }

  if (saveBtn) {
    saveBtn.onclick = function () {
      saveMemo(memoState.roomId, memoEl ? memoEl.value : '');
    };
  }
}

function setStar(id, item, star) {
  // 선택한 평가 항목(채광, 방음, 수압, 청결)의 별점(1~5)을 설정하고 화면을 갱신한다.
  if (STAR_CATEGORIES.indexOf(item) === -1) {
    return;
  }
  var numericStar = Number(star) || 0;
  if (numericStar < 1) {
    numericStar = 0;
  } else if (numericStar > 5) {
    numericStar = 5;
  }
  memoState.stars[item] = numericStar;
  showMemoStatus('');
  renderStarsUI();
  flushMemoAutoSave();
}

function calcAverage(room) {
  // 매물의 4개 항목 별점 평균 점수를 계산해 반환한다.
  var stars = room && room.stars ? room.stars : memoState.stars;
  var sum = 0;
  STAR_CATEGORIES.forEach(function (cat) {
    sum += Number(stars[cat]) || 0;
  });
  return sum / STAR_CATEGORIES.length;
}

function saveMemo(id, text) {
  // 입력한 메모 텍스트와 별점 정보를 해당 매물에 저장한다.
  if (memoAutoSaveTimer) {
    clearTimeout(memoAutoSaveTimer);
    memoAutoSaveTimer = null;
  }

  var result = persistMemoData(id, text, true);
  if (!result.ok) {
    if (result.reason === 'no-target') {
      showMemoStatus('저장할 매물을 먼저 선택해 주세요.');
    } else if (result.reason === 'not-found') {
      showMemoStatus('저장할 매물을 찾지 못했어요.');
    } else {
      showMemoStatus('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
    return;
  }

  var params = new URLSearchParams(window.location.search);
  if (!params.get('id') && memoState.roomId !== null) {
    setStoredSelectedRoomId(memoState.roomId);
  }

  var memoEl = document.getElementById('room-memo');
  if (memoEl && typeof result.savedText === 'string' && memoEl.value.trim() !== result.savedText) {
    memoEl.value = result.savedText;
  }

  showMemoStatus('메모와 별점을 저장했어요.');
}

window.addEventListener('pagehide', function () {
  flushMemoAutoSave();
});

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') {
    flushMemoAutoSave();
  }
});

document.addEventListener('DOMContentLoaded', function () {
  initMemoPage();
});
