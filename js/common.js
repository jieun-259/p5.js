var DEFAULT_ROOMS_DATA = [
  {
    id: 1,
    name: '상도동 햇살빌라',
    address: '서울 동작구 상도로 123',
    visitDate: '2026-11-25',
    deposit: 1000,
    rent: 52,
    fee: 5,
    area: 23,
    floor: 3,
    time: 8,
    feeItems: ['수도', '인터넷'],
    etc: '관리자 010-1234-5678 / 수도·인터넷 관리비 포함',
    photo: '',
    stars: { 채광: 5, 방음: 3, 수압: 4, 청결: 4 },
    memo: '남향이라 낮에 햇빛이 잘 들어옴. 저녁 시간대 도로 소음 한 번 더 확인 필요.',
    evaluated: true,
    totalScore: 92
  },
  {
    id: 2,
    name: '봉천동 청운하우스',
    address: '서울 관악구 청룡길 45',
    visitDate: '2026-11-23',
    deposit: 500,
    rent: 45,
    fee: 4,
    area: 20,
    floor: 2,
    time: 12,
    feeItems: ['수도'],
    etc: '',
    photo: '',
    stars: { 채광: 4, 방음: 4, 수압: 4, 청결: 3 },
    memo: '역까지 걸어서 가기 좋고 관리 상태가 깔끔함.',
    evaluated: true,
    totalScore: 84
  },
  {
    id: 3,
    name: '흑석동 그린원룸',
    address: '서울 동작구 흑석로 77',
    visitDate: '2026-11-26',
    deposit: 2000,
    rent: 40,
    fee: 5,
    area: 19,
    floor: 4,
    time: 15,
    feeItems: ['인터넷', '청소비'],
    etc: '',
    photo: '',
    stars: { 채광: 3, 방음: 4, 수압: 3, 청결: 4 },
    memo: '월세가 저렴한 편이나 언덕길 확인 필요.',
    evaluated: true,
    totalScore: 78
  },
  {
    id: 4,
    name: '대방동 미소빌',
    address: '서울 영등포구 여의대방로 12',
    visitDate: '2026-11-28',
    deposit: 1000,
    rent: 48,
    fee: 5,
    area: 21,
    floor: 2,
    time: 14,
    feeItems: [],
    etc: '',
    photo: '',
    stars: { 채광: 0, 방음: 0, 수압: 0, 청결: 0 },
    memo: '',
    evaluated: false,
    totalScore: null
  }
];

function loadRooms() {
  // localStorage의 "rooms" 키에서 매물 배열을 불러온다.
  try {
    var raw = localStorage.getItem('rooms');
    if (raw === null) {
      return DEFAULT_ROOMS_DATA.map(function (room) {
        return Object.assign({}, room, {
          feeItems: Array.isArray(room.feeItems) ? room.feeItems.slice() : []
        });
      });
    }
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // localStorage 읽기 오류 시 기본 목록 반환
  }
  return DEFAULT_ROOMS_DATA.slice();
}

function saveRooms(rooms) {
  // 전달받은 매물 배열을 JSON 문자열로 변환해 localStorage의 "rooms" 키에 저장한다.
  try {
    localStorage.setItem('rooms', JSON.stringify(rooms));
    return true;
  } catch (e) {
    return false;
  }
}

function findRoom(id) {
  // 매물 목록에서 id가 일치하는 매물 객체를 찾아 반환한다.
  var rooms = loadRooms();
  for (var i = 0; i < rooms.length; i++) {
    if (String(rooms[i].id) === String(id)) {
      return rooms[i];
    }
  }
  return null;
}

function openMenu() {
  // 모바일 햄버거 메뉴(.side-menu)와 반투명 배경(.menu-dim)을 연다.
  var sideMenu = document.querySelector('.side-menu');
  var menuDim = document.querySelector('.menu-dim');
  var menuBtn = document.querySelector('.menu-btn');

  if (sideMenu) {
    sideMenu.classList.add('is-open');
  }
  if (menuDim) {
    menuDim.classList.add('is-open');
    menuDim.setAttribute('aria-hidden', 'false');
  }
  if (menuBtn) {
    menuBtn.setAttribute('aria-expanded', 'true');
  }
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  // 모바일 햄버거 메뉴(.side-menu)와 반투명 배경(.menu-dim)을 닫는다.
  var sideMenu = document.querySelector('.side-menu');
  var menuDim = document.querySelector('.menu-dim');
  var menuBtn = document.querySelector('.menu-btn');

  if (sideMenu) {
    sideMenu.classList.remove('is-open');
  }
  if (menuDim) {
    menuDim.classList.remove('is-open');
    menuDim.setAttribute('aria-hidden', 'true');
  }
  if (menuBtn) {
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    closeMenu();
  }
});

document.addEventListener('click', function (event) {
  if (event.target.closest('.side-menu-link')) {
    closeMenu();
  }
});

window.addEventListener('resize', function () {
  if (window.innerWidth >= 1024) {
    closeMenu();
  }
});
