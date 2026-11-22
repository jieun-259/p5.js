/**
 * @fileoverview 달력 기반 매물 현장 방문 일정 등록 및 관리 모듈 (배지은 담당)
 * @ai-assisted 본 파일의 클래스 및 메서드는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * 팀원(배지은)이 월간 달력 UI, 날짜 선택 연동, 방문 상태 전환 흐름을 설계·검증하였습니다.
 */

(function (root) {
  'use strict';

  /**
   * @class CalendarManager
   * @description 월간 캘린더 그리드를 렌더링하고 날짜별 자취방 현장 방문 예약을
   * 등록, 완료 토글, 삭제하며 다가오는 일정 리스트를 동기화하는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 달력 셀 렌더링 및 일정 CRUD 로직으로 작성되었습니다.
   */
  class CalendarManager {
    /**
     * @function constructor
     * @description 현재 연/월과 선택된 날짜를 초기화하고 폼 및 네비게이션 이벤트를 연결합니다.
     * @param {Object} callbacks - 일정 추가/토글/삭제 시 호출할 컨트롤러 콜백
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    constructor(callbacks) {
      this.callbacks = callbacks || {};
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth();
      this.selectedDate = root.CalendarUtils
        ? root.CalendarUtils.formatDateKey(now)
        : now.toISOString().slice(0, 10);

      this.bindEvents();
    }

    /**
     * @function bindEvents
     * @description 이전 달/다음 달/오늘 이동 버튼과 방문 일정 등록 폼 제출 이벤트를 연결합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindEvents() {
      const prevBtn = document.getElementById('cal-prev-month');
      const nextBtn = document.getElementById('cal-next-month');
      const todayBtn = document.getElementById('cal-today-btn');
      const visitForm = document.getElementById('visit-form');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          this.viewMonth -= 1;
          if (this.viewMonth < 0) {
            this.viewMonth = 11;
            this.viewYear -= 1;
          }
          if (this.callbacks.onRequestRender) this.callbacks.onRequestRender();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.viewMonth += 1;
          if (this.viewMonth > 11) {
            this.viewMonth = 0;
            this.viewYear += 1;
          }
          if (this.callbacks.onRequestRender) this.callbacks.onRequestRender();
        });
      }

      if (todayBtn) {
        todayBtn.addEventListener('click', () => {
          const now = new Date();
          this.viewYear = now.getFullYear();
          this.viewMonth = now.getMonth();
          this.selectedDate = root.CalendarUtils.formatDateKey(now);
          const dateInput = document.getElementById('visit-date-input');
          if (dateInput) dateInput.value = this.selectedDate;
          if (this.callbacks.onRequestRender) this.callbacks.onRequestRender();
        });
      }

      if (visitForm) {
        visitForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleVisitSubmit();
        });
      }
    }

    /**
     * @function handleVisitSubmit
     * @description 방문 일정 등록 폼의 매물, 날짜, 시간, 메모를 검증하여 일정을 추가합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    handleVisitSubmit() {
      const propSelect = document.getElementById('visit-property-select');
      const dateInput = document.getElementById('visit-date-input');
      const timeInput = document.getElementById('visit-time-input');
      const memoInput = document.getElementById('visit-memo-input');

      const propertyId = propSelect ? propSelect.value : '';
      const date = dateInput ? dateInput.value : '';
      const time = timeInput ? timeInput.value : '14:00';
      const memo = memoInput ? memoInput.value.trim() : '';

      if (!propertyId) {
        if (this.callbacks.onNotify) {
          this.callbacks.onNotify('방문할 매물을 먼저 등록하거나 선택해 주세요.', 'warn');
        }
        return;
      }
      if (!date) {
        if (this.callbacks.onNotify) {
          this.callbacks.onNotify('방문 예정 날짜를 선택해 주세요.', 'warn');
        }
        return;
      }

      if (this.callbacks.onAddVisit) {
        this.callbacks.onAddVisit({ propertyId, date, time, memo });
      }
      if (memoInput) memoInput.value = '';
    }

    /**
     * @function render
     * @description 매물 드롭다운, 월간 캘린더 그리드, 전체/다가오는 방문 일정 목록을 렌더링합니다.
     * @param {Array<Object>} properties - 전체 매물 목록
     * @param {Array<Object>} visits - 전체 방문 일정 목록
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    render(properties, visits) {
      this.renderPropertyOptions(properties);
      this.renderCalendarGrid(properties, visits);
      this.renderVisitList(properties, visits);
    }

    /**
     * @function renderPropertyOptions
     * @description 방문 일정 폼의 매물 선택 셀렉트 박스와 기본 날짜 값을 동기화합니다.
     * @param {Array<Object>} properties - 매물 목록
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderPropertyOptions(properties) {
      const selectEl = document.getElementById('visit-property-select');
      const dateInput = document.getElementById('visit-date-input');
      if (dateInput && !dateInput.value) {
        dateInput.value = this.selectedDate;
      }
      if (!selectEl) return;

      const prevValue = selectEl.value;
      selectEl.innerHTML = '';

      if (!properties || !properties.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '등록된 매물이 없습니다';
        selectEl.appendChild(opt);
        return;
      }

      properties.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (도보 ${p.distanceMinutes}분)`;
        if (p.id === prevValue) opt.selected = true;
        selectEl.appendChild(opt);
      });
    }

    /**
     * @function renderCalendarGrid
     * @description CalendarUtils.getMonthGrid() 결과를 기반으로 7x6 월간 캘린더와 날짜별 방문 이벤트를 그립니다.
     * @param {Array<Object>} properties - 매물 목록
     * @param {Array<Object>} visits - 방문 일정 목록
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderCalendarGrid(properties, visits) {
      const titleEl = document.getElementById('cal-month-label');
      const gridEl = document.getElementById('cal-grid-body');
      if (!titleEl || !gridEl || !root.CalendarUtils) return;

      titleEl.textContent = `${this.viewYear}년 ${this.viewMonth + 1}월`;

      const propMap = {};
      (properties || []).forEach((p) => {
        propMap[p.id] = p;
      });

      const grouped = root.CalendarUtils.groupVisitsByDate(visits || []);
      const cells = root.CalendarUtils.getMonthGrid(this.viewYear, this.viewMonth);

      gridEl.innerHTML = '';
      cells.forEach((cell) => {
        const dayBtn = document.createElement('button');
        dayBtn.type = 'button';
        dayBtn.className = 'cal-day-cell';
        if (!cell.isCurrentMonth) dayBtn.classList.add('is-other-month');
        if (cell.isToday) dayBtn.classList.add('is-today');
        if (cell.dateKey === this.selectedDate) dayBtn.classList.add('is-selected');
        dayBtn.setAttribute('aria-label', `${cell.dateKey} 날짜 선택`);

        const numSpan = document.createElement('span');
        numSpan.className = 'cal-day-number tabular-nums';
        numSpan.textContent = String(cell.day);
        dayBtn.appendChild(numSpan);

        const dayVisits = grouped[cell.dateKey] || [];
        if (dayVisits.length > 0) {
          const eventList = document.createElement('div');
          eventList.className = 'cal-day-events';
          dayVisits.slice(0, 2).forEach((v) => {
            const prop = propMap[v.propertyId];
            const item = document.createElement('span');
            item.className = `cal-event-line${v.completed ? ' is-done' : ''}`;
            item.style.borderColor = prop ? prop.color : '#2563EB';
            item.textContent = `${v.time || ''} ${prop ? prop.name : '방문'}`;
            eventList.appendChild(item);
          });
          if (dayVisits.length > 2) {
            const more = document.createElement('span');
            more.className = 'cal-event-more';
            more.textContent = `+${dayVisits.length - 2}건 더`;
            eventList.appendChild(more);
          }
          dayBtn.appendChild(eventList);
        }

        dayBtn.addEventListener('click', () => {
          this.selectedDate = cell.dateKey;
          const dateInput = document.getElementById('visit-date-input');
          if (dateInput) dateInput.value = cell.dateKey;
          if (this.callbacks.onRequestRender) this.callbacks.onRequestRender();
        });

        gridEl.appendChild(dayBtn);
      });
    }

    /**
     * @function renderVisitList
     * @description 등록된 방문 일정을 시간순으로 정렬하여 완료 체크 및 삭제 버튼과 함께 렌더링합니다.
     * @param {Array<Object>} properties - 매물 목록
     * @param {Array<Object>} visits - 방문 일정 목록
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderVisitList(properties, visits) {
      const listEl = document.getElementById('visit-schedule-list');
      if (!listEl || !root.CalendarUtils) return;

      const propMap = {};
      (properties || []).forEach((p) => {
        propMap[p.id] = p;
      });

      const sorted = root.CalendarUtils.sortVisits(visits || []);
      listEl.innerHTML = '';

      if (!sorted.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state-box';
        empty.textContent = '예약된 현장 방문 일정이 없습니다. 왼쪽 폼에서 일정을 추가해 보세요.';
        listEl.appendChild(empty);
        return;
      }

      sorted.forEach((v) => {
        const prop = propMap[v.propertyId];
        const card = document.createElement('div');
        card.className = `visit-item-card${v.completed ? ' is-completed' : ''}`;
        if (v.date === this.selectedDate) {
          card.classList.add('is-date-focused');
        }

        const header = document.createElement('div');
        header.className = 'visit-item-header';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'visit-title-wrap';

        const dot = document.createElement('span');
        dot.className = 'visit-color-dot';
        dot.style.backgroundColor = prop ? prop.color : '#64748B';

        const title = document.createElement('strong');
        title.textContent = prop ? prop.name : '삭제된 매물';

        const dateMeta = document.createElement('span');
        dateMeta.className = 'visit-date-meta tabular-nums';
        dateMeta.textContent = `${v.date} · ${v.time || '시간 미정'} · ${v.completed ? '방문완료' : '방문예정'}`;

        titleWrap.appendChild(dot);
        titleWrap.appendChild(title);

        const actions = document.createElement('div');
        actions.className = 'visit-item-actions';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn-text-action';
        toggleBtn.textContent = v.completed ? '완료 취소' : '방문 완료';
        toggleBtn.setAttribute('aria-label', `${prop ? prop.name : '일정'} ${v.date} ${v.completed ? '완료 취소' : '방문 완료'}`);
        toggleBtn.addEventListener('click', () => {
          if (this.callbacks.onToggleVisit) this.callbacks.onToggleVisit(v.id);
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-text-action is-danger';
        delBtn.textContent = '삭제';
        delBtn.setAttribute('aria-label', `${prop ? prop.name : '일정'} ${v.date} 삭제`);
        delBtn.addEventListener('click', () => {
          if (this.callbacks.onDeleteVisit) this.callbacks.onDeleteVisit(v.id);
        });

        actions.appendChild(toggleBtn);
        actions.appendChild(delBtn);

        header.appendChild(titleWrap);
        header.appendChild(actions);
        card.appendChild(header);
        card.appendChild(dateMeta);

        if (v.memo) {
          const memoP = document.createElement('p');
          memoP.className = 'visit-memo-text';
          memoP.textContent = v.memo;
          card.appendChild(memoP);
        }

        listEl.appendChild(card);
      });
    }
  }

  root.CalendarManager = CalendarManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
