var registerState = {
  editId: null,
  feeItems: [],
  photoDataUrl: ''
};

function showFormError(message) {
  var errorEl = document.getElementById('form-error');
  if (!errorEl) {
    return;
  }
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}

function syncFeeButtons() {
  var buttons = document.querySelectorAll('.fee-chip-btn');
  buttons.forEach(function (btn) {
    var label = btn.getAttribute('data-fee') || btn.textContent.trim();
    var selected = registerState.feeItems.indexOf(label) !== -1;
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function setPhotoPreview(dataUrl) {
  var imgEl = document.getElementById('photo-preview');
  var textEl = document.querySelector('.photo-upload-text');
  var subEl = document.querySelector('.photo-upload-sub');
  registerState.photoDataUrl = dataUrl || '';

  if (imgEl) {
    if (registerState.photoDataUrl) {
      imgEl.src = registerState.photoDataUrl;
      imgEl.style.display = 'block';
    } else {
      imgEl.removeAttribute('src');
      imgEl.style.display = 'none';
    }
  }
  if (textEl) {
    textEl.textContent = registerState.photoDataUrl ? '사진 변경하기' : '사진 1장 올리기';
  }
  if (subEl) {
    subEl.textContent = registerState.photoDataUrl
      ? '다른 사진을 선택하려면 다시 눌러 주세요'
      : '여기를 눌러 방 사진을 선택해 주세요';
  }
}

function openForm() {
  // 주소의 ?id= 유무를 확인해 등록 모드 또는 수정 모드로 폼을 초기화한다.
  var params = new URLSearchParams(window.location.search);
  var idParam = params.get('id');
  var titleEl = document.querySelector('.header-title');
  var subLinksEl = document.querySelector('.edit-sub-links');
  var deleteBtn = document.getElementById('delete-room-btn');
  var submitBtn = document.getElementById('submit-room-btn');

  showFormError('');

  if (idParam && findRoom(idParam)) {
    registerState.editId = idParam;
    if (titleEl) {
      titleEl.textContent = '매물 수정';
    }
    document.title = '매물 수정 · 자취방 선택 도우미';
    if (subLinksEl) {
      subLinksEl.style.display = 'grid';
      var links = subLinksEl.querySelectorAll('a');
      if (links[0]) {
        links[0].href = 'checklist.html?id=' + encodeURIComponent(idParam);
      }
      if (links[1]) {
        links[1].href = 'memo.html?id=' + encodeURIComponent(idParam);
      }
    }
    if (deleteBtn) {
      deleteBtn.style.display = 'inline-flex';
      deleteBtn.onclick = function () {
        deleteRoom(registerState.editId);
      };
    }
    if (submitBtn) {
      submitBtn.textContent = '수정';
      submitBtn.onclick = function () {
        updateRoom(registerState.editId, getFormData());
      };
    }
    fillForm(idParam);
  } else {
    registerState.editId = null;
    registerState.feeItems = [];
    setPhotoPreview('');

    if (titleEl) {
      titleEl.textContent = '매물 등록';
    }
    document.title = '매물 등록 · 자취방 선택 도우미';

    var inputIds = [
      'room-name',
      'room-address',
      'room-visit-date',
      'room-deposit',
      'room-rent',
      'room-fee',
      'room-area',
      'room-floor',
      'room-time',
      'room-etc'
    ];
    inputIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.value = '';
      }
    });

    syncFeeButtons();

    if (subLinksEl) {
      subLinksEl.style.display = 'none';
    }
    if (deleteBtn) {
      deleteBtn.style.display = 'none';
    }
    if (submitBtn) {
      submitBtn.textContent = '등록';
      submitBtn.onclick = function () {
        addRoom(getFormData());
      };
    }
  }
}

function previewPhoto(file) {
  // 선택한 사진 파일 1장을 읽어 미리보기 이미지 영역에 표시한다.
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function (event) {
    var result = event.target && event.target.result ? String(event.target.result) : '';
    if (!result) {
      return;
    }
    var img = new Image();
    img.onload = function () {
      var maxSide = 720;
      var width = img.width;
      var height = img.height;
      if (width > maxSide || height > maxSide) {
        if (width >= height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      }
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.75));
      } else {
        setPhotoPreview(result);
      }
    };
    img.onerror = function () {
      setPhotoPreview(result);
    };
    img.src = result;
  };
  reader.readAsDataURL(file);
}

function getFormData() {
  // 입력 폼의 매물 정보와 숫자 항목, feeItems를 읽어 객체로 반환한다.
  function readText(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function readNum(id) {
    var el = document.getElementById(id);
    if (!el || el.value === '') {
      return 0;
    }
    var parsed = Number(el.value);
    return isNaN(parsed) ? 0 : parsed;
  }

  return {
    name: readText('room-name'),
    address: readText('room-address'),
    visitDate: readText('room-visit-date'),
    deposit: readNum('room-deposit'),
    rent: readNum('room-rent'),
    fee: readNum('room-fee'),
    area: readNum('room-area'),
    floor: readNum('room-floor'),
    time: readNum('room-time'),
    feeItems: registerState.feeItems.slice(),
    etc: readText('room-etc'),
    photo: registerState.photoDataUrl
  };
}

function fillForm(id) {
  // 수정 모드일 때 id에 해당하는 기존 매물 데이터와 feeItems를 폼에 채운다.
  var room = findRoom(id);
  if (!room) {
    return;
  }

  function setValue(elId, val) {
    var el = document.getElementById(elId);
    if (el) {
      el.value = val !== undefined && val !== null ? String(val) : '';
    }
  }

  setValue('room-name', room.name || '');
  setValue('room-address', room.address || '');
  setValue('room-visit-date', room.visitDate || '');
  setValue('room-deposit', room.deposit !== undefined ? room.deposit : '');
  setValue('room-rent', room.rent !== undefined ? room.rent : '');
  setValue('room-fee', room.fee !== undefined ? room.fee : '');
  setValue('room-area', room.area !== undefined ? room.area : '');
  setValue('room-floor', room.floor !== undefined ? room.floor : '');
  setValue('room-time', room.time !== undefined ? room.time : '');
  setValue('room-etc', room.etc || '');

  registerState.feeItems = Array.isArray(room.feeItems) ? room.feeItems.slice() : [];
  syncFeeButtons();
  setPhotoPreview(room.photo || '');
}

function toggleFeeItem(item) {
  // 관리비 포함 항목 버튼 클릭 시 선택 상태를 전환하고 feeItems 배열을 갱신한다.
  if (!item) {
    return;
  }
  var idx = registerState.feeItems.indexOf(item);
  if (idx === -1) {
    registerState.feeItems.push(item);
  } else {
    registerState.feeItems.splice(idx, 1);
  }
  syncFeeButtons();
}

function addRoom(room) {
  // 새 매물 객체를 생성해 localStorage의 rooms 목록에 추가 저장한다.
  if (!room || !room.name) {
    showFormError('매물 이름을 입력해 주세요.');
    var nameInput = document.getElementById('room-name');
    if (nameInput) {
      nameInput.focus();
    }
    return;
  }

  var rooms = loadRooms();
  var newRoom = Object.assign({}, room, {
    id: Date.now(),
    feeItems: Array.isArray(room.feeItems) ? room.feeItems.slice() : [],
    evaluated: false,
    totalScore: null
  });

  rooms.push(newRoom);
  if (!saveRooms(rooms)) {
    showFormError('저장 공간이 부족해 매물을 저장하지 못했어요. 사진 크기를 줄여서 다시 시도해 주세요.');
    return;
  }
  window.location.href = 'index.html';
}

function updateRoom(id, room) {
  // 기존 매물 id를 찾아 수정된 매물 정보로 갱신한 뒤 저장한다.
  var targetId = id !== undefined && id !== null ? id : registerState.editId;
  if (!room || !room.name) {
    showFormError('매물 이름을 입력해 주세요.');
    var nameInput = document.getElementById('room-name');
    if (nameInput) {
      nameInput.focus();
    }
    return;
  }

  var rooms = loadRooms();
  var updated = false;
  for (var i = 0; i < rooms.length; i++) {
    if (String(rooms[i].id) === String(targetId)) {
      rooms[i] = Object.assign({}, rooms[i], room, {
        id: rooms[i].id,
        feeItems: Array.isArray(room.feeItems) ? room.feeItems.slice() : []
      });
      updated = true;
      break;
    }
  }

  if (!updated) {
    showFormError('수정할 매물을 찾지 못했어요.');
    return;
  }

  if (!saveRooms(rooms)) {
    showFormError('저장 공간이 부족해 수정 내용을 저장하지 못했어요.');
    return;
  }
  window.location.href = 'index.html';
}

function deleteRoom(id) {
  // 해당 id의 매물을 목록에서 삭제하고 저장한 뒤 홈으로 이동한다.
  var targetId = id !== undefined && id !== null ? id : registerState.editId;
  var rooms = loadRooms().filter(function (room) {
    return String(room.id) !== String(targetId);
  });
  saveRooms(rooms);
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', function () {
  openForm();
});
