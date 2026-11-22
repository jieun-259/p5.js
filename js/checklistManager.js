/**
 * @fileoverview 현장 방문 체크리스트, 매물별 메모 및 별점 평가 관리 모듈 (김세정 담당)
 * @ai-assisted 본 파일의 클래스 및 메서드는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * 팀원(김세정)이 자취방 현장 점검 항목(수압·채광·곰팡이·방음·옵션·보안)과 평가 UX를 확정하였습니다.
 */

(function (root) {
  'use strict';

  /**
   * @class ChecklistManager
   * @description 선택된 자취방 매물의 현장 점검 체크리스트(미확인/양호/주의),
   * 세부 항목별 현장 메모, 1~5점 별점 평가, 종합 메모를 렌더링하고 상태 변화를 저장하는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 동적 체크리스트 UI 및 이벤트 위임 로직으로 작성되었습니다.
   */
  class ChecklistManager {
    /**
     * @function constructor
     * @description ChecklistManager를 초기화하고 매물 선택기/별점/메모 이벤트를 연결합니다.
     * @param {Object} callbacks - 상태 변경 시 컨트롤러에 알리는 콜백 객체
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    constructor(callbacks) {
      this.callbacks = callbacks || {};
      this.bindControls();
    }

    /**
     * @function bindControls
     * @description 매물 드롭다운 선택, 별점 버튼, 종합 메모 입력창의 이벤트 리스너를 바인딩합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindControls() {
      const selectEl = document.getElementById('checklist-property-select');
      if (selectEl) {
        selectEl.addEventListener('change', (e) => {
          if (this.callbacks.onSelectProperty) {
            this.callbacks.onSelectProperty(e.target.value);
          }
        });
      }

      const memoEl = document.getElementById('checklist-memo-input');
      if (memoEl) {
        memoEl.addEventListener('input', (e) => {
          if (this.callbacks.onUpdateMemo) {
            this.callbacks.onUpdateMemo(e.target.value);
          }
        });
      }

      const starContainer = document.getElementById('checklist-star-buttons');
      if (starContainer) {
        starContainer.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-star]');
          if (!btn) return;
          const rating = Number(btn.dataset.star);
          if (this.callbacks.onUpdateRating) {
            this.callbacks.onUpdateRating(rating);
          }
        });
      }
    }

    /**
     * @function render
     * @description 전체 매물 드롭다운과 현재 선택된 매물의 체크리스트, 사진 갤러리, 별점, 메모를 렌더링합니다.
     * @param {Array<Object>} properties - 전체 매물 목록
     * @param {string} selectedId - 현재 선택된 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    render(properties, selectedId) {
      const selectEl = document.getElementById('checklist-property-select');
      const panelEl = document.getElementById('checklist-workspace');
      const emptyEl = document.getElementById('checklist-empty');

      if (!selectEl || !panelEl || !emptyEl) return;

      selectEl.innerHTML = '';
      if (!properties || !properties.length) {
        panelEl.hidden = true;
        emptyEl.hidden = false;
        return;
      }

      panelEl.hidden = false;
      emptyEl.hidden = true;

      properties.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.roomType || '원룸'})`;
        opt.selected = p.id === selectedId;
        selectEl.appendChild(opt);
      });

      const current = properties.find((p) => p.id === selectedId) || properties[0];
      this.renderPropertyHeader(current);
      this.renderChecklistItems(current);
      this.renderStarRating(current.rating || 0);

      const memoEl = document.getElementById('checklist-memo-input');
      if (memoEl && document.activeElement !== memoEl) {
        memoEl.value = current.memo || '';
      }
    }

    /**
     * @function renderPropertyHeader
     * @description 선택된 매물의 요약 정보(보증금/월세, 거리, 면적, 현장 사진 썸네일)를 표시합니다.
     * @param {Object} property - 선택된 매물 객체
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderPropertyHeader(property) {
      const titleEl = document.getElementById('checklist-room-title');
      const metaEl = document.getElementById('checklist-room-meta');
      const galleryEl = document.getElementById('checklist-photo-strip');
      const summaryEl = document.getElementById('checklist-progress-summary');

      if (titleEl) titleEl.textContent = property.name;
      if (metaEl) {
        metaEl.textContent = `${property.roomType || '원룸'} · 보증금 ${property.deposit}만원 · 월세 ${property.rent}만원 + 관리비 ${property.maintenanceFee}만원 · 도보 ${property.distanceMinutes}분 · ${property.areaPyeong}평`;
      }

      if (summaryEl && root.RoomScoring) {
        const engine = new root.RoomScoring.RoomScoringEngine();
        const stats = engine.calculateChecklistStats(property.checklist);
        summaryEl.textContent = `점검 완료율 ${stats.completionRate}% · 양호 ${stats.good}건 · 주의 ${stats.warn}건 · 미확인 ${stats.total - stats.checked}건`;
      }

      if (galleryEl) {
        galleryEl.innerHTML = '';
        if (property.photos && property.photos.length) {
          property.photos.forEach((src, i) => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = `${property.name} 현장 사진 ${i + 1}`;
            img.className = 'checklist-photo-thumb';
            img.referrerPolicy = 'no-referrer';
            galleryEl.appendChild(img);
          });
        } else {
          const span = document.createElement('span');
          span.className = 'muted-caption';
          span.textContent = '등록된 현장 사진이 없습니다.';
          galleryEl.appendChild(span);
        }
      }
    }

    /**
     * @function renderChecklistItems
     * @description 6가지 현장 점검 항목별 상태 전환 버튼('미확인', '양호', '주의')과 항목별 메모 입력창을 생성합니다.
     * @param {Object} property - 선택된 매물 객체
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderChecklistItems(property) {
      const listEl = document.getElementById('checklist-items-container');
      if (!listEl) return;

      const definitions = root.CHECKLIST_DEFINITIONS || [];
      const currentMap = property.checklist || {};
      const notesMap = property.checklistNotes || {};
      listEl.innerHTML = '';

      definitions.forEach((def) => {
        const status = currentMap[def.key] || 'pending';
        const row = document.createElement('div');
        row.className = `checklist-item-row status-${status}`;

        const infoCol = document.createElement('div');
        infoCol.className = 'checklist-item-info';

        const labelEl = document.createElement('strong');
        labelEl.className = 'checklist-item-label';
        labelEl.textContent = def.label;

        const hintEl = document.createElement('p');
        hintEl.className = 'checklist-item-hint';
        hintEl.textContent = def.hint;

        const noteInput = document.createElement('input');
        noteInput.type = 'text';
        noteInput.className = 'checklist-item-note';
        noteInput.placeholder = `${def.label} 관련 현장 특이사항 메모...`;
        noteInput.value = notesMap[def.key] || '';
        noteInput.setAttribute('aria-label', `${def.label} 특이사항 메모`);
        noteInput.addEventListener('input', (e) => {
          if (this.callbacks.onUpdateChecklistNote) {
            this.callbacks.onUpdateChecklistNote(property.id, def.key, e.target.value);
          }
        });

        infoCol.appendChild(labelEl);
        infoCol.appendChild(hintEl);
        infoCol.appendChild(noteInput);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'checklist-status-group';
        btnGroup.setAttribute('role', 'group');
        btnGroup.setAttribute('aria-label', `${def.label} 상태 선택`);

        const statuses = [
          { code: 'pending', text: '미확인' },
          { code: 'good', text: '양호' },
          { code: 'warn', text: '주의' },
        ];

        statuses.forEach((st) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `status-toggle-btn${status === st.code ? ' is-active-' + st.code : ''}`;
          btn.textContent = st.text;
          btn.setAttribute('aria-pressed', String(status === st.code));
          btn.setAttribute('aria-label', `${def.label} ${st.text}`);
          btn.addEventListener('click', () => {
            if (this.callbacks.onUpdateChecklistStatus) {
              this.callbacks.onUpdateChecklistStatus(property.id, def.key, st.code);
            }
          });
          btnGroup.appendChild(btn);
        });

        row.appendChild(infoCol);
        row.appendChild(btnGroup);
        listEl.appendChild(row);
      });
    }

    /**
     * @function renderStarRating
     * @description 현재 매물의 별점(1~5점) 버튼 활성화 상태와 텍스트 수치를 업데이트합니다.
     * @param {number} rating - 현재 별점 (0~5)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderStarRating(rating) {
      const buttons = document.querySelectorAll('#checklist-star-buttons button[data-star]');
      buttons.forEach((btn) => {
        const val = Number(btn.dataset.star);
        const active = val <= Math.round(rating);
        btn.classList.toggle('is-filled', active);
        btn.setAttribute('aria-pressed', String(val === Math.round(rating)));
      });
      const labelEl = document.getElementById('checklist-star-value');
      if (labelEl) {
        labelEl.textContent = `${rating || 0} / 5.0`;
      }
    }
  }

  root.ChecklistManager = ChecklistManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
