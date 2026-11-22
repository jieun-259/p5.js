/**
 * @fileoverview p5.js 메인 스케치 진입점 및 자취방 선택 도우미 통합 컨트롤러
 * @ai-assisted 본 파일의 클래스 및 p5.js 라이프사이클 함수는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * 3단계 화면 전환, 풀스크린 모드, windowResized 대응, 가중치 실시간 계산, LocalStorage 연동을 총괄합니다.
 */

(function (root) {
  'use strict';

  /**
   * @class AppController
   * @description 애플리케이션의 전역 상태, 3단계 화면 전환(소개/메인/엔딩크레딧),
   * 가중치 슬라이더, 풀스크린 토글, 확인 모달, 각 기능별 매니저를 통합 관리하는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 상태 관리 및 모듈 오케스트레이션 구조로 작성되었습니다.
   */
  class AppController {
    /**
     * @function constructor
     * @description 각 하위 모듈 인스턴스를 초기화하고 초기 상태를 준비합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    constructor() {
      this.scoringEngine = new root.RoomScoring.RoomScoringEngine();
      this.storage = new root.StorageManager();
      this.sampleFactory = new root.SampleDataFactory();
      this.exporter = new root.ReportExporter();

      this.state = null;
      this.rankedResults = [];
      this.currentScreen = 'intro'; // 'intro' | 'main' | 'credits'
      this.currentTab = 'overview'; // 'overview' | 'properties' | 'checklist' | 'calendar'
      this.p5Ready = false;
      this.confirmCallback = null;
      this.toastTimer = null;

      this.visualizer = new root.RoomCanvasVisualizer({
        onSelectProperty: (id) => this.selectProperty(id),
        onMovePin: (id, nx, ny, saveNow) => this.updatePinCoordinates(id, nx, ny, saveNow),
        onFinishMovePin: () => this.persistAndRefresh(),
      });

      this.propertyManager = new root.PropertyManager(this.storage, {
        onSelectProperty: (id) => this.selectProperty(id),
        onEditProperty: (id) => this.startEditProperty(id),
        onDeleteProperty: (id, name) => this.confirmDeleteProperty(id, name),
        onSaveProperty: (payload) => this.saveProperty(payload),
        onNotify: (msg, type) => this.showToast(msg, type),
      });

      this.checklistManager = new root.ChecklistManager({
        onSelectProperty: (id) => this.selectProperty(id),
        onUpdateChecklistStatus: (propId, key, status) => this.updateChecklistStatus(propId, key, status),
        onUpdateChecklistNote: (propId, key, note) => this.updateChecklistNote(propId, key, note),
        onUpdateRating: (rating) => this.updateSelectedRating(rating),
        onUpdateMemo: (memo) => this.updateSelectedMemo(memo),
      });

      this.calendarManager = new root.CalendarManager({
        onAddVisit: (visitData) => this.addVisit(visitData),
        onToggleVisit: (visitId) => this.toggleVisitCompleted(visitId),
        onDeleteVisit: (visitId) => this.deleteVisit(visitId),
        onRequestRender: () => this.renderAllViews(),
        onNotify: (msg, type) => this.showToast(msg, type),
      });
    }

    /**
     * @function init
     * @description 저장된 LocalStorage 데이터를 불러오거나 샘플 데이터를 생성한 뒤,
     * UI 이벤트를 연결하고 로딩 스피너를 자연스럽게 해제합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    init() {
      this.hydrateState();
      this.bindNavigationEvents();
      this.bindWeightControls();
      this.bindCanvasToolbarEvents();
      this.bindFullscreenEvents();
      this.bindConfirmModalEvents();

      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        this.switchScreen('main');
      } else {
        this.switchScreen('intro');
      }

      this.recomputeAndRender(false);

      // 앱 시작 시 데이터 로딩 스피너 표시 후 부드럽게 전환
      setTimeout(() => {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
          loader.classList.add('is-hidden');
          setTimeout(() => {
            loader.hidden = true;
          }, 260);
        }
        this.resizeP5Canvas();
      }, 420);
    }

    /**
     * @function hydrateState
     * @description LocalStorage에서 이전 작업 상태를 복원하고, 없을 경우 샘플 매물 3개와 방문 일정을 로드합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    hydrateState() {
      const saved = this.storage.loadState();
      if (saved && Array.isArray(saved.properties)) {
        this.state = {
          properties: saved.properties,
          weights: saved.weights || this.sampleFactory.createDefaultWeights(),
          visits: Array.isArray(saved.visits) ? saved.visits : [],
          selectedPropertyId:
            saved.selectedPropertyId || (saved.properties[0] ? saved.properties[0].id : null),
        };
      } else {
        this.state = this.sampleFactory.createInitialState();
        this.storage.saveState(this.state);
      }
    }

    /**
     * @function persistAndRefresh
     * @description 현재 상태를 LocalStorage에 저장하고 점수를 재계산하여 모든 화면을 갱신합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    persistAndRefresh() {
      const saved = this.storage.saveState(this.state);
      if (!saved) {
        this.showToast('저장 공간이 부족하여 일부 이미지가 저장되지 않을 수 있습니다.', 'warn');
      }
      this.recomputeAndRender(false);
    }

    /**
     * @function recomputeAndRender
     * @description 가중치 기반 종합 순위를 다시 계산하고 DOM 뷰를 업데이트합니다.
     * @param {boolean} [shouldSave=true] - LocalStorage 자동 저장 실행 여부
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    recomputeAndRender(shouldSave = true) {
      if (shouldSave) {
        this.storage.saveState(this.state);
      }
      this.rankedResults = this.scoringEngine.rankProperties(this.state.properties, this.state.weights);

      if (
        this.state.properties.length > 0 &&
        !this.state.properties.some((p) => p.id === this.state.selectedPropertyId)
      ) {
        this.state.selectedPropertyId = this.rankedResults[0].property.id;
      }

      this.renderAllViews();
    }

    /**
     * @function renderAllViews
     * @description 가중치 수치, 순위 목록, 현장 체크리스트, 달력 화면을 일관되게 동기화합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderAllViews() {
      this.renderWeightReadouts();
      this.propertyManager.renderRankingList(this.rankedResults, this.state.selectedPropertyId);
      this.checklistManager.render(this.state.properties, this.state.selectedPropertyId);
      this.calendarManager.render(this.state.properties, this.state.visits);
    }

    /**
     * @function bindNavigationEvents
     * @description 3단계 화면 전환 버튼과 메인 화면 내 4개 기능 탭 전환 이벤트를 연결합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindNavigationEvents() {
      const startBtn = document.getElementById('btn-start-app');
      const introCreditsBtn = document.getElementById('btn-intro-credits');
      const backIntroBtn = document.getElementById('btn-back-intro');
      const goCreditsBtn = document.getElementById('btn-go-credits');
      const creditsHomeBtn = document.getElementById('btn-credits-home');
      const creditsMainBtn = document.getElementById('btn-credits-main');
      const quickAddBtn = document.getElementById('btn-quick-add-room');
      const exportPngBtn = document.getElementById('btn-export-png');
      const exportTxtBtn = document.getElementById('btn-export-txt');

      if (startBtn) startBtn.addEventListener('click', () => this.switchScreen('main'));
      if (introCreditsBtn) introCreditsBtn.addEventListener('click', () => this.switchScreen('credits'));
      if (backIntroBtn) backIntroBtn.addEventListener('click', () => this.switchScreen('intro'));
      if (goCreditsBtn) goCreditsBtn.addEventListener('click', () => this.switchScreen('credits'));
      if (creditsHomeBtn) creditsHomeBtn.addEventListener('click', () => this.switchScreen('intro'));
      if (creditsMainBtn) creditsMainBtn.addEventListener('click', () => this.switchScreen('main'));

      if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
          this.propertyManager.resetForm();
          this.switchTab('properties');
        });
      }

      if (exportPngBtn) {
        exportPngBtn.addEventListener('click', () => {
          const ok = this.exporter.exportPngViaP5(
            this.visualizer,
            this.rankedResults,
            this.state.weights,
            this.state.visits
          );
          if (ok) {
            this.showToast('최종 비교 결과 리포트 PNG 이미지가 저장되었습니다.', 'success');
          } else {
            this.showToast('PNG 이미지를 생성하지 못했습니다.', 'error');
          }
        });
      }

      if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
          const ok = this.exporter.downloadTextReport(
            this.rankedResults,
            this.state.weights,
            this.state.visits
          );
          if (ok) {
            this.showToast('요약 리포트 파일(.txt)이 다운로드되었습니다.', 'success');
          } else {
            this.showToast('리포트 파일 생성 중 오류가 발생했습니다.', 'error');
          }
        });
      }

      const tabButtons = document.querySelectorAll('[data-tab]');
      tabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          this.switchTab(btn.dataset.tab);
        });
      });
    }

    /**
     * @function switchScreen
     * @description 첫 화면(intro), 메인 화면(main), 엔딩 크레딧(credits) 간 전환을 수행하고
     * 메인 화면 진입 시 p5.js 캔버스 크기를 재계산합니다.
     * @param {'intro'|'main'|'credits'} screenName - 전환할 화면 이름
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    switchScreen(screenName) {
      this.currentScreen = screenName;
      document.body.dataset.screen = screenName;

      const screens = {
        intro: document.getElementById('screen-intro'),
        main: document.getElementById('screen-main'),
        credits: document.getElementById('screen-credits'),
      };

      Object.entries(screens).forEach(([key, el]) => {
        if (!el) return;
        const active = key === screenName;
        el.hidden = !active;
        el.classList.toggle('is-active', active);
      });

      if (screenName === 'main') {
        requestAnimationFrame(() => {
          this.resizeP5Canvas();
        });
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    /**
     * @function switchTab
     * @description 메인 화면 내부의 작업 탭(종합 비교, 매물 등록, 체크리스트, 방문 캘린더)을 전환합니다.
     * @param {'overview'|'properties'|'checklist'|'calendar'} tabName - 전환할 탭 이름
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    switchTab(tabName) {
      this.currentTab = tabName;
      document.body.dataset.tab = tabName;

      document.querySelectorAll('[data-tab]').forEach((btn) => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });

      const panels = {
        overview: document.getElementById('tab-overview'),
        properties: document.getElementById('tab-properties'),
        checklist: document.getElementById('tab-checklist'),
        calendar: document.getElementById('tab-calendar'),
      };

      Object.entries(panels).forEach(([key, panel]) => {
        if (!panel) return;
        panel.hidden = key !== tabName;
      });

      if (tabName === 'overview') {
        requestAnimationFrame(() => {
          this.resizeP5Canvas();
        });
      }
    }

    /**
     * @function bindWeightControls
     * @description 평가 항목별 가중치 슬라이더(김수현 담당) 및 프리셋 버튼의 입력 이벤트를 연결합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindWeightControls() {
      const keys = ['price', 'distance', 'area', 'option'];
      keys.forEach((key) => {
        const slider = document.getElementById(`weight-${key}`);
        if (!slider) return;
        slider.addEventListener('input', (e) => {
          this.state.weights[key] = Number(e.target.value);
          this.recomputeAndRender(true);
        });
      });

      const presets = {
        balanced: { price: 35, distance: 30, area: 20, option: 15 },
        budget: { price: 60, distance: 20, area: 10, option: 10 },
        commute: { price: 20, distance: 55, area: 15, option: 10 },
        space: { price: 20, distance: 15, area: 45, option: 20 },
      };

      document.querySelectorAll('[data-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const preset = presets[btn.dataset.preset];
          if (!preset) return;
          this.state.weights = { ...preset };
          this.recomputeAndRender(true);
          this.showToast(`'${btn.textContent.trim()}' 가중치 기준이 적용되었습니다.`, 'info');
        });
      });
    }

    /**
     * @function renderWeightReadouts
     * @description 정규화된 가중치 퍼센트와 슬라이더 위치를 UI에 반영합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    renderWeightReadouts() {
      const norm = this.scoringEngine.normalizeWeights(this.state.weights);
      ['price', 'distance', 'area', 'option'].forEach((key) => {
        const slider = document.getElementById(`weight-${key}`);
        const readout = document.getElementById(`weight-${key}-pct`);
        if (slider) slider.value = String(this.state.weights[key]);
        if (readout) readout.textContent = `${norm.percents[key]}%`;
      });
    }

    /**
     * @function bindCanvasToolbarEvents
     * @description p5.js 캔버스 보기 모드 전환 버튼, 핀 위치 초기화, 샘플 데이터 초기화 버튼을 연결합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindCanvasToolbarEvents() {
      const modeButtons = document.querySelectorAll('[data-viz-mode]');
      modeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.vizMode;
          this.visualizer.setViewMode(mode);
          modeButtons.forEach((b) => {
            const active = b.dataset.vizMode === mode;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-pressed', String(active));
          });
          this.resizeP5Canvas();
        });
      });

      const resetPinsBtn = document.getElementById('btn-reset-pins');
      if (resetPinsBtn) {
        resetPinsBtn.addEventListener('click', () => {
          const total = this.state.properties.length;
          this.state.properties.forEach((p, idx) => {
            const angle = (idx / Math.max(1, total)) * Math.PI * 2 - Math.PI / 3;
            const radius = Math.min(0.38, 0.14 + (p.distanceMinutes / 25) * 0.24);
            p.mapX = Math.max(0.12, Math.min(0.88, 0.5 + Math.cos(angle) * radius));
            p.mapY = Math.max(0.14, Math.min(0.86, 0.52 + Math.sin(angle) * radius));
          });
          this.persistAndRefresh();
          this.showToast('지도 핀 배치를 도보 거리 기준으로 정렬했습니다.', 'info');
        });
      }

      const resetSamplesBtn = document.getElementById('btn-reset-samples');
      if (resetSamplesBtn) {
        resetSamplesBtn.addEventListener('click', () => {
          this.openConfirmModal(
            '샘플 데이터 초기화',
            '현재 등록된 모든 매물과 체크리스트, 일정이 초기 샘플(3개 매물)로 되돌아갑니다. 계속할까요?',
            () => {
              this.storage.clearState();
              this.state = this.sampleFactory.createInitialState();
              this.recomputeAndRender(true);
              this.showToast('초기 샘플 매물과 일정으로 복원되었습니다.', 'info');
            }
          );
        });
      }
    }

    /**
     * @function bindFullscreenEvents
     * @description p5.js fullscreen() 함수를 이용해 전체 화면 전환/해제를 수행하고
     * 브라우저 fullscreenchange 이벤트에 맞춰 버튼 라벨과 캔버스 크기를 동기화합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindFullscreenEvents() {
      const toggleHandler = () => {
        if (typeof window.fullscreen === 'function') {
          const current = window.fullscreen();
          window.fullscreen(!current);
        } else if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      };

      const btnIntro = document.getElementById('btn-intro-fullscreen');
      const btnMain = document.getElementById('btn-fullscreen-main');
      if (btnIntro) btnIntro.addEventListener('click', toggleHandler);
      if (btnMain) btnMain.addEventListener('click', toggleHandler);

      document.addEventListener('fullscreenchange', () => {
        const isFull = Boolean(document.fullscreenElement);
        [btnIntro, btnMain].forEach((btn) => {
          if (!btn) return;
          btn.textContent = isFull ? '전체 화면 해제' : '전체 화면';
          btn.setAttribute('aria-pressed', String(isFull));
        });
        setTimeout(() => this.resizeP5Canvas(), 80);
      });
    }

    /**
     * @function bindConfirmModalEvents
     * @description window.confirm 대신 사용하는 접근성 준수 인앱 확인 모달 이벤트를 연결합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    bindConfirmModalEvents() {
      const modal = document.getElementById('confirm-modal');
      const cancelBtn = document.getElementById('confirm-cancel');
      const acceptBtn = document.getElementById('confirm-accept');

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.closeConfirmModal());
      }
      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          const cb = this.confirmCallback;
          this.closeConfirmModal();
          if (cb) cb();
        });
      }
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeConfirmModal();
        });
      }
    }

    /**
     * @function openConfirmModal
     * @description 사용자 확인이 필요한 작업(삭제, 초기화) 시 모달을 엽니다.
     * @param {string} title - 모달 제목
     * @param {string} message - 확인 안내 문구
     * @param {Function} onAccept - 확인 클릭 시 실행할 콜백
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    openConfirmModal(title, message, onAccept) {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-title');
      const msgEl = document.getElementById('confirm-message');
      if (!modal) return;
      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      this.confirmCallback = onAccept;
      modal.hidden = false;
      const acceptBtn = document.getElementById('confirm-accept');
      if (acceptBtn) acceptBtn.focus();
    }

    /**
     * @function closeConfirmModal
     * @description 확인 모달을 닫고 콜백 참조를 정리합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    closeConfirmModal() {
      const modal = document.getElementById('confirm-modal');
      if (modal) modal.hidden = true;
      this.confirmCallback = null;
    }

    /**
     * @function selectProperty
     * @description 특정 매물을 선택 상태로 설정하고 시각화/목록/체크리스트 뷰를 동기화합니다.
     * @param {string} id - 선택할 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    selectProperty(id) {
      this.state.selectedPropertyId = id;
      this.persistAndRefresh();
    }

    /**
     * @function startEditProperty
     * @description 매물 수정 폼으로 해당 매물 정보를 불러오고 매물 등록·수정 탭으로 이동합니다.
     * @param {string} id - 수정할 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    startEditProperty(id) {
      const target = this.state.properties.find((p) => p.id === id);
      if (!target) return;
      this.propertyManager.loadPropertyIntoForm(target);
      this.switchTab('properties');
      this.showToast(`'${target.name}' 수정 모드로 전환되었습니다.`, 'info');
    }

    /**
     * @function saveProperty
     * @description 매물 등록 폼에서 전달된 데이터로 신규 매물을 추가하거나 기존 매물을 업데이트합니다.
     * @param {Object} payload - 폼에서 수집한 매물 데이터
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    saveProperty(payload) {
      const palette = root.PROPERTY_COLORS || ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#DC2626'];
      if (payload.id) {
        const idx = this.state.properties.findIndex((p) => p.id === payload.id);
        if (idx !== -1) {
          this.state.properties[idx] = {
            ...this.state.properties[idx],
            ...payload,
          };
          this.state.selectedPropertyId = payload.id;
          this.recomputeAndRender(true);
          this.showToast(`'${payload.name}' 매물 정보가 수정되었습니다.`, 'success');
          return;
        }
      }

      const newId = `prop-${Date.now()}`;
      const color = palette[this.state.properties.length % palette.length];
      const angle = this.state.properties.length * 1.4;
      const radius = Math.min(0.36, 0.14 + (payload.distanceMinutes / 25) * 0.22);
      const newProperty = {
        ...payload,
        id: newId,
        color,
        mapX: Math.max(0.12, Math.min(0.88, 0.5 + Math.cos(angle) * radius)),
        mapY: Math.max(0.14, Math.min(0.86, 0.52 + Math.sin(angle) * radius)),
        rating: 0,
        memo: '',
        checklist: {
          water: 'pending',
          light: 'pending',
          mold: 'pending',
          noise: 'pending',
          options: 'pending',
          security: 'pending',
        },
        checklistNotes: {},
      };

      this.state.properties.push(newProperty);
      this.state.selectedPropertyId = newId;
      this.recomputeAndRender(true);
      this.showToast(`'${newProperty.name}' 매물이 등록되었습니다.`, 'success');
    }

    /**
     * @function confirmDeleteProperty
     * @description 매물 삭제 전 확인 모달을 띄우고, 승인 시 매물 및 연결된 방문 일정을 함께 삭제합니다.
     * @param {string} id - 삭제할 매물 ID
     * @param {string} name - 매물명
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    confirmDeleteProperty(id, name) {
      this.openConfirmModal(
        '매물 삭제 확인',
        `'${name}' 매물과 해당 매물의 방문 일정을 삭제할까요?`,
        () => {
          this.state.properties = this.state.properties.filter((p) => p.id !== id);
          this.state.visits = this.state.visits.filter((v) => v.propertyId !== id);
          if (this.state.selectedPropertyId === id) {
            this.state.selectedPropertyId = this.state.properties[0] ? this.state.properties[0].id : null;
          }
          this.recomputeAndRender(true);
          this.showToast(`'${name}' 매물이 삭제되었습니다.`, 'info');
        }
      );
    }

    /**
     * @function updatePinCoordinates
     * @description p5.js 지도에서 핀을 드래그할 때 좌표와 도보 소요 시간(분)을 실시간으로 갱신합니다.
     * @param {string} id - 매물 ID
     * @param {number} nx - 정규화 X 좌표 (0~1)
     * @param {number} ny - 정규화 Y 좌표 (0~1)
     * @param {boolean} saveNow - 즉시 LocalStorage 저장 여부
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    updatePinCoordinates(id, nx, ny, saveNow) {
      const prop = this.state.properties.find((p) => p.id === id);
      if (!prop) return;
      prop.mapX = nx;
      prop.mapY = ny;
      prop.distanceMinutes = this.scoringEngine.calculateDistanceFromMapCoords(nx, ny);
      this.recomputeAndRender(Boolean(saveNow));
    }

    /**
     * @function updateChecklistStatus
     * @description 선택된 매물의 특정 현장 점검 항목 상태('pending'|'good'|'warn')를 업데이트합니다.
     * @param {string} propId - 매물 ID
     * @param {string} key - 점검 항목 키
     * @param {string} status - 변경할 상태
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    updateChecklistStatus(propId, key, status) {
      const prop = this.state.properties.find((p) => p.id === propId);
      if (!prop) return;
      if (!prop.checklist) prop.checklist = {};
      prop.checklist[key] = status;
      this.recomputeAndRender(true);
    }

    /**
     * @function updateChecklistNote
     * @description 선택된 매물의 특정 현장 점검 항목별 메모를 저장합니다.
     * @param {string} propId - 매물 ID
     * @param {string} key - 점검 항목 키
     * @param {string} note - 메모 텍스트
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    updateChecklistNote(propId, key, note) {
      const prop = this.state.properties.find((p) => p.id === propId);
      if (!prop) return;
      if (!prop.checklistNotes) prop.checklistNotes = {};
      prop.checklistNotes[key] = note;
      this.storage.saveState(this.state);
    }

    /**
     * @function updateSelectedRating
     * @description 현재 선택된 매물의 별점(1~5)을 저장하고 순위/뷰를 갱신합니다.
     * @param {number} rating - 별점 값
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    updateSelectedRating(rating) {
      const prop = this.state.properties.find((p) => p.id === this.state.selectedPropertyId);
      if (!prop) return;
      prop.rating = rating;
      this.recomputeAndRender(true);
      this.showToast(`'${prop.name}' 별점이 ★${rating}점으로 저장되었습니다.`, 'success');
    }

    /**
     * @function updateSelectedMemo
     * @description 현재 선택된 매물의 현장 방문 종합 메모를 자동 저장합니다.
     * @param {string} memo - 메모 내용
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    updateSelectedMemo(memo) {
      const prop = this.state.properties.find((p) => p.id === this.state.selectedPropertyId);
      if (!prop) return;
      prop.memo = memo;
      this.storage.saveState(this.state);
    }

    /**
     * @function addVisit
     * @description 달력에서 새로운 현장 방문 예약을 추가하고 저장합니다.
     * @param {Object} visitData - { propertyId, date, time, memo }
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    addVisit(visitData) {
      const newVisit = {
        id: `visit-${Date.now()}`,
        propertyId: visitData.propertyId,
        date: visitData.date,
        time: visitData.time || '14:00',
        memo: visitData.memo || '',
        completed: false,
      };
      this.state.visits.push(newVisit);
      this.calendarManager.selectedDate = visitData.date;
      this.persistAndRefresh();
      this.showToast(`${visitData.date} 방문 일정이 등록되었습니다.`, 'success');
    }

    /**
     * @function toggleVisitCompleted
     * @description 방문 일정의 완료/예정 상태를 전환합니다.
     * @param {string} visitId - 일정 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    toggleVisitCompleted(visitId) {
      const target = this.state.visits.find((v) => v.id === visitId);
      if (!target) return;
      target.completed = !target.completed;
      this.persistAndRefresh();
    }

    /**
     * @function deleteVisit
     * @description 등록된 방문 일정을 삭제합니다.
     * @param {string} visitId - 일정 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    deleteVisit(visitId) {
      this.state.visits = this.state.visits.filter((v) => v.id !== visitId);
      this.persistAndRefresh();
      this.showToast('방문 일정이 삭제되었습니다.', 'info');
    }

    /**
     * @function resizeP5Canvas
     * @description 현재 캔버스 컨테이너의 실제 너비/높이에 맞춰 p5.js 캔버스 크기를 동적으로 조절합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    resizeP5Canvas() {
      if (!this.p5Ready || typeof window.resizeCanvas !== 'function') return;
      const container = document.getElementById('p5-canvas-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const targetW = Math.max(280, Math.floor(rect.width));
      const stackedMobile = targetW < 760 && this.visualizer.viewMode === 'both';
      const targetH = stackedMobile
        ? 820
        : Math.max(460, Math.min(620, Math.floor(window.innerHeight * 0.65)));
      if (targetW > 0 && targetH > 0) {
        window.resizeCanvas(targetW, targetH);
      }
    }

    /**
     * @function showToast
     * @description 화면 하단에 비차단(Non-blocking) 토스트 알림 메시지를 잠시 표시합니다.
     * @param {string} message - 표시할 안내 문구
     * @param {'info'|'success'|'warn'|'error'} [type='info'] - 스타일 유형
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    showToast(message, type = 'info') {
      const region = document.getElementById('toast-region');
      if (!region) return;
      region.textContent = message;
      region.className = `toast-banner is-visible is-${type}`;

      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        region.classList.remove('is-visible');
      }, 3000);
    }
  }

  let appController = null;

  /**
   * @function setup
   * @description p5.js 표준 초기화 함수. 캔버스를 생성해 지정된 DOM 컨테이너에 마운트하고
   * 애플리케이션 컨트롤러를 시작합니다.
   * @ai-assisted AI의 도움을 받아 p5.js 캔버스 마운트 및 컨트롤러 초기화 흐름으로 작성되었습니다.
   */
  root.setup = function () {
    appController = new AppController();
    root.appController = appController;

    const container = document.getElementById('p5-canvas-container');
    const initW = container && container.clientWidth > 300 ? container.clientWidth : 760;
    const initH = 520;
    const cnv = window.createCanvas(initW, initH);
    if (container) {
      cnv.parent(container);
    }
    window.textFont('Noto Sans KR, Plus Jakarta Sans, sans-serif');
    appController.p5Ready = true;
    appController.init();
  };

  /**
   * @function draw
   * @description p5.js 매 프레임 렌더링 루프. 메인 화면의 비교 시각화 탭이 활성화된 동안
   * RoomCanvasVisualizer를 호출해 레이더 차트·점수 막대·캠퍼스 지도를 그립니다.
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  root.draw = function () {
    if (!appController || appController.currentScreen !== 'main' || appController.currentTab !== 'overview') {
      return;
    }
    appController.visualizer.render(
      window.width,
      window.height,
      appController.rankedResults,
      appController.state.weights,
      appController.state.selectedPropertyId
    );
  };

  /**
   * @function windowResized
   * @description p5.js 표준 창 크기 변경 이벤트 핸들러. 브라우저 창 크기 변화나 풀스크린 전환 시
   * 캔버스 크기를 컨테이너에 맞춰 즉시 재조정합니다.
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  root.windowResized = function () {
    if (appController) {
      appController.resizeP5Canvas();
    }
  };

  /**
   * @function mouseMoved
   * @description p5.js 마우스 이동 이벤트 핸들러. 캔버스 영역 내 호버 상태를 시각화 모듈에 전달합니다.
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  root.mouseMoved = function () {
    if (!appController || appController.currentScreen !== 'main' || appController.currentTab !== 'overview') {
      return;
    }
    if (window.mouseX >= 0 && window.mouseX <= window.width && window.mouseY >= 0 && window.mouseY <= window.height) {
      appController.visualizer.handleMouseMoved(window.mouseX, window.mouseY);
    } else {
      appController.visualizer.hoveredPropertyId = null;
    }
  };

  /**
   * @function mousePressed
   * @description p5.js 마우스 클릭 이벤트 핸들러. 캔버스 내부 요소(핀/꼭짓점/막대) 클릭을 처리합니다.
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  root.mousePressed = function () {
    if (!appController || appController.currentScreen !== 'main' || appController.currentTab !== 'overview') {
      return;
    }
    if (window.mouseX >= 0 && window.mouseX <= window.width && window.mouseY >= 0 && window.mouseY <= window.height) {
      appController.visualizer.handleMousePressed(window.mouseX, window.mouseY);
    }
  };

  /**
   * @function mouseDragged
   * @description p5.js 마우스 드래그 이벤트 핸들러. 지도 핀 드래그 이동을 처리합니다.
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  root.mouseDragged = function () {
    if (!appController || appController.currentScreen !== 'main' || appController.currentTab !== 'overview') {
      return;
    }
    appController.visualizer.handleMouseDragged(window.mouseX, window.mouseY);
  };

  /**
   * @function mouseReleased
   * @description p5.js 마우스 릴리스 이벤트 핸들러. 핀 드래그 종료 시 변경 좌표를 저장합니다.
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  root.mouseReleased = function () {
    if (!appController) return;
    appController.visualizer.handleMouseReleased();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
