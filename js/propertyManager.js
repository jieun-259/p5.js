/**
 * @fileoverview 매물 등록, 수정, 삭제 및 현장 사진 업로드·압축 관리 모듈 (최지원 담당)
 * @ai-assisted 본 파일의 클래스 및 메서드는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * 팀원(최지원)이 매물 입력 필드, 옵션 구성, 사진 미리보기 UX를 설계·검증하였습니다.
 */

(function (root) {
  'use strict';

  /**
   * @class PropertyManager
   * @description 자취방 매물의 CRUD(등록·수정·삭제) 폼 제어, 다중 사진 압축 업로드 및 미리보기,
   * 그리고 실시간 추천 순위 리스트 렌더링을 담당하는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 DOM 바인딩 및 폼 검증 로직으로 작성되었습니다.
   */
  class PropertyManager {
    /**
     * @function constructor
     * @description 매물 관리자 인스턴스를 생성하고 편집 중인 사진 버퍼와 콜백을 초기화합니다.
     * @param {Object} storageManager - StorageManager 인스턴스
     * @param {Object} callbacks - 상태 변경 및 알림 콜백 모음
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    constructor(storageManager, callbacks) {
      this.storage = storageManager;
      this.callbacks = callbacks || {};
      this.editingId = null;
      this.draftPhotos = [];
      this.bindFormEvents();
      this.renderOptionCheckboxes();
    }

    /**
     * @function renderOptionCheckboxes
     * @description ALL_OPTION_KEYS를 기반으로 매물 등록 폼의 옵션 체크박스 목록을 렌더링합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderOptionCheckboxes() {
      const container = document.getElementById('prop-options-grid');
      if (!container || !root.RoomScoring) return;

      container.innerHTML = '';
      root.RoomScoring.ALL_OPTION_KEYS.forEach((optName, idx) => {
        const label = document.createElement('label');
        label.className = 'option-check-item';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'prop-options';
        input.value = optName;
        input.id = `prop-opt-${idx}`;

        const span = document.createElement('span');
        span.textContent = optName;

        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
      });
    }

    /**
     * @function bindFormEvents
     * @description 매물 등록/수정 폼 제출, 초기화, 사진 파일 선택 이벤트를 연결합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindFormEvents() {
      const form = document.getElementById('property-form');
      const photoInput = document.getElementById('prop-photo-input');
      const resetBtn = document.getElementById('prop-form-reset');

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleFormSubmit();
        });
      }

      if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          for (const file of files) {
            if (this.draftPhotos.length >= 4) {
              this.notify('사진은 매물당 최대 4장까지 첨부할 수 있습니다.', 'warn');
              break;
            }
            try {
              const compressed = await this.storage.compressImageFile(file, 640, 0.72);
              this.draftPhotos.push(compressed);
            } catch (err) {
              this.notify(err.message || '사진 압축 중 오류가 발생했습니다.', 'error');
            }
          }
          photoInput.value = '';
          this.renderPhotoPreviewList();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.resetForm();
        });
      }
    }

    /**
     * @function notify
     * @description 컨트롤러의 토스트 알림 콜백을 안전하게 호출합니다.
     * @param {string} message - 사용자에게 표시할 메시지
     * @param {string} [type='info'] - 알림 유형
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    notify(message, type) {
      if (this.callbacks.onNotify) {
        this.callbacks.onNotify(message, type || 'info');
      }
    }

    /**
     * @function renderPhotoPreviewList
     * @description 현재 업로드 대기/편집 중인 사진 썸네일과 개별 삭제 버튼을 렌더링합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderPhotoPreviewList() {
      const container = document.getElementById('prop-photo-preview-list');
      if (!container) return;
      container.innerHTML = '';

      if (!this.draftPhotos.length) {
        const empty = document.createElement('p');
        empty.className = 'muted-caption';
        empty.textContent = '첨부된 사진이 없습니다. (최대 4장, 자동 압축 저장)';
        container.appendChild(empty);
        return;
      }

      this.draftPhotos.forEach((src, index) => {
        const card = document.createElement('div');
        card.className = 'photo-preview-item';

        const img = document.createElement('img');
        img.src = src;
        img.alt = `현장 사진 미리보기 ${index + 1}`;
        img.referrerPolicy = 'no-referrer';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'photo-remove-btn';
        removeBtn.setAttribute('aria-label', `현장 사진 ${index + 1} 삭제`);
        removeBtn.textContent = '삭제';
        removeBtn.addEventListener('click', () => {
          this.draftPhotos.splice(index, 1);
          this.renderPhotoPreviewList();
        });

        card.appendChild(img);
        card.appendChild(removeBtn);
        container.appendChild(card);
      });
    }

    /**
     * @function loadPropertyIntoForm
     * @description 기존 매물 데이터를 수정 모드로 폼 필드에 채워 넣고 편집 상태로 전환합니다.
     * @param {Object} property - 수정할 매물 객체
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    loadPropertyIntoForm(property) {
      if (!property) return;
      this.editingId = property.id;
      this.draftPhotos = Array.isArray(property.photos) ? [...property.photos] : [];

      document.getElementById('prop-name').value = property.name || '';
      document.getElementById('prop-room-type').value = property.roomType || '';
      document.getElementById('prop-deposit').value = property.deposit ?? '';
      document.getElementById('prop-rent').value = property.rent ?? '';
      document.getElementById('prop-fee').value = property.maintenanceFee ?? '';
      document.getElementById('prop-distance').value = property.distanceMinutes ?? '';
      document.getElementById('prop-area').value = property.areaPyeong ?? '';
      document.getElementById('prop-address').value = property.addressHint || '';

      const checkboxes = document.querySelectorAll('input[name="prop-options"]');
      const activeSet = new Set(property.options || []);
      checkboxes.forEach((cb) => {
        cb.checked = activeSet.has(cb.value);
      });

      const titleEl = document.getElementById('prop-form-title');
      const submitBtn = document.getElementById('prop-form-submit');
      if (titleEl) titleEl.textContent = `'${property.name}' 매물 수정`;
      if (submitBtn) submitBtn.textContent = '수정 내용 저장';

      this.renderPhotoPreviewList();
    }

    /**
     * @function resetForm
     * @description 매물 등록/수정 폼을 초기 신규 등록 상태로 비웁니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    resetForm() {
      this.editingId = null;
      this.draftPhotos = [];
      const form = document.getElementById('property-form');
      if (form) form.reset();

      const titleEl = document.getElementById('prop-form-title');
      const submitBtn = document.getElementById('prop-form-submit');
      if (titleEl) titleEl.textContent = '새 자취방 매물 등록';
      if (submitBtn) submitBtn.textContent = '매물 등록하기';

      this.renderPhotoPreviewList();
    }

    /**
     * @function handleFormSubmit
     * @description 입력값을 검증한 뒤 신규 매물 추가 또는 기존 매물 수정 콜백을 호출합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    handleFormSubmit() {
      const name = document.getElementById('prop-name').value.trim();
      const roomType = document.getElementById('prop-room-type').value.trim() || '원룸';
      const deposit = Number(document.getElementById('prop-deposit').value);
      const rent = Number(document.getElementById('prop-rent').value);
      const maintenanceFee = Number(document.getElementById('prop-fee').value || 0);
      const distanceMinutes = Number(document.getElementById('prop-distance').value);
      const areaPyeong = Number(document.getElementById('prop-area').value);
      const addressHint = document.getElementById('prop-address').value.trim();

      if (!name) {
        this.notify('매물명을 입력해 주세요.', 'warn');
        document.getElementById('prop-name').focus();
        return;
      }
      if (Number.isNaN(deposit) || deposit < 0 || Number.isNaN(rent) || rent <= 0) {
        this.notify('보증금과 월세를 올바른 숫자로 입력해 주세요.', 'warn');
        return;
      }
      if (Number.isNaN(distanceMinutes) || distanceMinutes <= 0 || Number.isNaN(areaPyeong) || areaPyeong <= 0) {
        this.notify('도보 거리(분)와 전용 면적(평)을 올바르게 입력해 주세요.', 'warn');
        return;
      }

      const selectedOptions = Array.from(document.querySelectorAll('input[name="prop-options"]:checked')).map(
        (cb) => cb.value
      );

      const payload = {
        id: this.editingId,
        name,
        roomType,
        addressHint,
        deposit,
        rent,
        maintenanceFee,
        distanceMinutes,
        areaPyeong,
        options: selectedOptions,
        photos: [...this.draftPhotos],
      };

      if (this.callbacks.onSaveProperty) {
        this.callbacks.onSaveProperty(payload);
      }
      this.resetForm();
    }

    /**
     * @function renderRankingList
     * @description 종합 점수 순으로 정렬된 매물 리스트를 대시보드 우측 패널과 매물 관리 탭에 렌더링합니다.
     * @param {Array<Object>} rankedResults - rankProperties() 결과 배열
     * @param {string} selectedId - 현재 선택된 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderRankingList(rankedResults, selectedId) {
      const overviewList = document.getElementById('ranking-list-container');
      const manageList = document.getElementById('manage-property-list');

      if (overviewList) {
        this.populatePropertyCards(overviewList, rankedResults, selectedId, false);
      }
      if (manageList) {
        this.populatePropertyCards(manageList, rankedResults, selectedId, true);
      }
    }

    /**
     * @function populatePropertyCards
     * @description 지정된 컨테이너에 매물 순위 카드 및 액션 버튼(선택, 수정, 삭제)을 생성합니다.
     * @param {HTMLElement} container - 대상 DOM 컨테이너
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과
     * @param {string} selectedId - 선택된 매물 ID
     * @param {boolean} showManageActions - 수정/삭제 강조 여부
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    populatePropertyCards(container, rankedResults, selectedId, showManageActions) {
      container.innerHTML = '';

      if (!rankedResults.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state-box';
        empty.textContent = '등록된 매물이 없습니다. 새 매물을 등록해 비교를 시작하세요.';
        container.appendChild(empty);
        return;
      }

      rankedResults.forEach((item) => {
        const p = item.property;
        const isSelected = p.id === selectedId;
        const card = document.createElement('article');
        card.className = `property-rank-card${isSelected ? ' is-selected' : ''}`;
        card.dataset.propertyId = p.id;

        const headerRow = document.createElement('div');
        headerRow.className = 'rank-card-header';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'rank-title-wrap';

        const colorDot = document.createElement('span');
        colorDot.className = 'rank-color-marker';
        colorDot.style.backgroundColor = p.color || '#2563EB';
        colorDot.textContent = String(item.rank);

        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'rank-select-btn';
        selectBtn.textContent = p.name;
        selectBtn.setAttribute('aria-label', `${p.name} 선택`);
        selectBtn.addEventListener('click', () => {
          if (this.callbacks.onSelectProperty) this.callbacks.onSelectProperty(p.id);
        });

        titleWrap.appendChild(colorDot);
        titleWrap.appendChild(selectBtn);

        const scoreEl = document.createElement('span');
        scoreEl.className = 'rank-total-score tabular-nums';
        scoreEl.textContent = `${item.totalScore.toFixed(1)}점`;

        headerRow.appendChild(titleWrap);
        headerRow.appendChild(scoreEl);
        card.appendChild(headerRow);

        // 깔끔한 인라인 텍스트 메타데이터 (Zero-Pill 규칙 준수)
        const metaLine = document.createElement('p');
        metaLine.className = 'rank-meta-line tabular-nums';
        metaLine.textContent = `보증금 ${p.deposit} · 월 ${item.directMonthlyCost}만원 · 도보 ${p.distanceMinutes}분 · ${p.areaPyeong}평`;
        card.appendChild(metaLine);

        if (showManageActions || isSelected) {
          const previewRow = document.createElement('div');
          previewRow.className = 'rank-detail-row';

          if (p.photos && p.photos.length > 0) {
            const thumb = document.createElement('img');
            thumb.src = p.photos[0];
            thumb.alt = `${p.name} 현장 사진`;
            thumb.className = 'rank-thumb-img';
            thumb.referrerPolicy = 'no-referrer';
            previewRow.appendChild(thumb);
          }

          const subInfo = document.createElement('div');
          subInfo.className = 'rank-sub-info';
          subInfo.innerHTML = `<span class="tabular-nums">별점 ★${p.rating || 0} · 현장점검 ${item.checklistStats.completionRate}%</span>`;

          const actionBar = document.createElement('div');
          actionBar.className = 'rank-card-actions';

          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'btn-text-action';
          editBtn.textContent = '수정';
          editBtn.setAttribute('aria-label', `'${p.name}' 수정`);
          editBtn.addEventListener('click', () => {
            if (this.callbacks.onEditProperty) this.callbacks.onEditProperty(p.id);
          });

          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn-text-action is-danger';
          delBtn.textContent = '삭제';
          delBtn.setAttribute('aria-label', `'${p.name}' 삭제`);
          delBtn.addEventListener('click', () => {
            if (this.callbacks.onDeleteProperty) this.callbacks.onDeleteProperty(p.id, p.name);
          });

          actionBar.appendChild(editBtn);
          actionBar.appendChild(delBtn);
          subInfo.appendChild(actionBar);
          previewRow.appendChild(subInfo);
          card.appendChild(previewRow);
        }

        container.appendChild(card);
      });
    }
  }

  root.PropertyManager = PropertyManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
