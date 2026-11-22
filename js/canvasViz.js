/**
 * @fileoverview p5.js 기반 인터랙티브 레이더 차트, 점수 막대 그래프 및 캠퍼스 지도 핀 보드 시각화 모듈
 * @ai-assisted 본 파일의 클래스 및 메서드는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * p5.js 2D 드로잉, 선형 보간(lerp) 애니메이션, 마우스 호버/클릭/드래그 인터랙션을 구현하였습니다.
 */

(function (root) {
  'use strict';

  /**
   * @class RoomCanvasVisualizer
   * @description p5.js 캔버스 위에서 매물별 4축 레이더 차트(가격·거리·면적·옵션),
   * 실시간 가중치 적용 종합점수 그래프, 그리고 드래그 가능한 캠퍼스 주변 지도 핀을 렌더링하고
   * 마우스 인터랙션(호버, 클릭, 드래그) 및 PNG 리포트 그래픽 생성을 담당하는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 반응형 레이아웃 수학 및 인터랙티브 캔버스 로직으로 작성되었습니다.
   */
  class RoomCanvasVisualizer {
    /**
     * @function constructor
     * @description 시각화 상태, 애니메이션 보간 맵, 드래그·호버 상태 및 콜백을 초기화합니다.
     * @param {Object} callbacks - 선택/호버/핀 이동 시 호출할 외부 컨트롤러 콜백
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    constructor(callbacks) {
      this.callbacks = callbacks || {};
      this.viewMode = 'both'; // 'both' | 'radar' | 'map'
      this.hoveredPropertyId = null;
      this.hoveredAxisIndex = -1;
      this.draggingPropertyId = null;
      this.dragOffset = { x: 0, y: 0 };
      this.animatedScores = {}; // id -> { price, distance, area, option, total }
      this.pulsePhase = 0;
      this.hitTargets = {
        radarPoints: [],
        scoreBars: [],
        mapPins: [],
      };
      this.lastMapRect = null;
    }

    /**
     * @function setViewMode
     * @description 캔버스 표시 모드('both', 'radar', 'map')를 전환합니다.
     * @param {string} mode - 표시 모드
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    setViewMode(mode) {
      if (mode === 'both' || mode === 'radar' || mode === 'map') {
        this.viewMode = mode;
      }
    }

    /**
     * @function syncAnimatedState
     * @description 가중치나 매물 데이터가 변경될 때 각 매물의 점수를 부드럽게 보간(lerp)합니다.
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과 배열
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    syncAnimatedState(rankedResults) {
      const lerpFactor = 0.16;
      const activeIds = new Set();

      for (const item of rankedResults) {
        const id = item.property.id;
        activeIds.add(id);
        if (!this.animatedScores[id]) {
          this.animatedScores[id] = {
            price: item.subScores.price,
            distance: item.subScores.distance,
            area: item.subScores.area,
            option: item.subScores.option,
            total: item.totalScore,
          };
        } else {
          const cur = this.animatedScores[id];
          cur.price += (item.subScores.price - cur.price) * lerpFactor;
          cur.distance += (item.subScores.distance - cur.distance) * lerpFactor;
          cur.area += (item.subScores.area - cur.area) * lerpFactor;
          cur.option += (item.subScores.option - cur.option) * lerpFactor;
          cur.total += (item.totalScore - cur.total) * lerpFactor;
        }
      }

      for (const existingId of Object.keys(this.animatedScores)) {
        if (!activeIds.has(existingId)) {
          delete this.animatedScores[existingId];
        }
      }
    }

    /**
     * @function hexToRgbArray
     * @description 16진수 색상 문자열('#2563EB')을 [r, g, b] 숫자 배열로 변환합니다.
     * @param {string} hex - HEX 색상 문자열
     * @returns {Array<number>} [r, g, b] 배열
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    hexToRgbArray(hex) {
      const clean = (hex || '#2563EB').replace('#', '');
      const num = parseInt(clean, 16);
      if (Number.isNaN(num)) return [37, 99, 235];
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }

    /**
     * @function render
     * @description p5.js draw() 루프에서 호출되며, 현재 캔버스 크기와 viewMode에 맞춰
     * 레이더 차트, 점수 막대 그래프, 캠퍼스 지도 핀 보드를 그립니다.
     * @param {number} w - 캔버스 너비
     * @param {number} h - 캔버스 높이
     * @param {Array<Object>} rankedResults - 정렬된 매물 평가 결과
     * @param {Object} weights - 현재 가중치 객체
     * @param {string} selectedId - 현재 선택된 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    render(w, h, rankedResults, weights, selectedId) {
      this.pulsePhase += 0.04;
      this.syncAnimatedState(rankedResults);
      this.hitTargets = { radarPoints: [], scoreBars: [], mapPins: [] };
      this.lastMapRect = null;

      window.background(248, 250, 252);

      if (!rankedResults || rankedResults.length === 0) {
        this.drawEmptyCanvas(w, h);
        return;
      }

      const isWide = w >= 760;
      const pad = 16;

      if (this.viewMode === 'both') {
        if (isWide) {
          const leftW = Math.floor((w - pad * 3) * 0.52);
          const rightW = w - pad * 3 - leftW;
          const panelH = h - pad * 2;
          this.drawRadarAndBarsPanel(pad, pad, leftW, panelH, rankedResults, weights, selectedId);
          this.drawCampusMapPanel(pad * 2 + leftW, pad, rightW, panelH, rankedResults, selectedId);
        } else {
          const topH = Math.floor((h - pad * 3) * 0.52);
          const botH = h - pad * 3 - topH;
          this.drawRadarAndBarsPanel(pad, pad, w - pad * 2, topH, rankedResults, weights, selectedId);
          this.drawCampusMapPanel(pad, pad * 2 + topH, w - pad * 2, botH, rankedResults, selectedId);
        }
      } else if (this.viewMode === 'radar') {
        this.drawRadarAndBarsPanel(pad, pad, w - pad * 2, h - pad * 2, rankedResults, weights, selectedId);
      } else {
        this.drawCampusMapPanel(pad, pad, w - pad * 2, h - pad * 2, rankedResults, selectedId);
      }

      this.drawTooltipOverlay(w, h, rankedResults, selectedId);
      this.updateCursorState();
    }

    /**
     * @function drawEmptyCanvas
     * @description 등록된 매물이 없을 때 안내 문구를 p5.js 캔버스 중앙에 렌더링합니다.
     * @param {number} w - 캔버스 너비
     * @param {number} h - 캔버스 높이
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    drawEmptyCanvas(w, h) {
      window.push();
      window.fill(255);
      window.stroke(226, 232, 240);
      window.strokeWeight(1);
      window.rect(16, 16, w - 32, h - 32, 12);
      window.noStroke();
      window.fill(15, 23, 42);
      window.textAlign(window.CENTER, window.CENTER);
      window.textSize(16);
      window.text('등록된 자취방 매물이 없습니다.', w / 2, h / 2 - 14);
      window.fill(100, 116, 139);
      window.textSize(13);
      window.text('상단 [매물 등록 · 수정] 탭에서 첫 매물을 추가해 보세요.', w / 2, h / 2 + 14);
      window.pop();
    }

    /**
     * @function drawRadarAndBarsPanel
     * @description 왼쪽/상단 패널에 4축 인터랙티브 레이더 차트와 매물별 종합점수 막대 그래프를 그립니다.
     * @param {number} x - 패널 시작 X
     * @param {number} y - 패널 시작 Y
     * @param {number} w - 패널 너비
     * @param {number} h - 패널 높이
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과
     * @param {Object} weights - 현재 가중치
     * @param {string} selectedId - 선택된 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    drawRadarAndBarsPanel(x, y, w, h, rankedResults, weights, selectedId) {
      window.push();
      // 패널 배경 카드
      window.fill(255);
      window.stroke(226, 232, 240);
      window.strokeWeight(1);
      window.rect(x, y, w, h, 12);

      // 패널 제목 및 안내
      window.noStroke();
      window.fill(15, 23, 42);
      window.textAlign(window.LEFT, window.TOP);
      window.textSize(14);
      window.textStyle(window.BOLD);
      window.text('항목별 밸런스 레이더 & 종합 점수', x + 18, y + 14);

      window.textStyle(window.NORMAL);
      window.fill(100, 116, 139);
      window.textSize(11);
      const subtitle = w >= 420
        ? '꼭짓점·막대에 마우스를 올리면 상세 점수를 확인하고, 클릭해 매물을 선택합니다.'
        : '꼭짓점·막대를 터치/클릭해 매물을 선택하세요.';
      window.text(subtitle, x + 18, y + 34, w - 36);

      const engine = new root.RoomScoring.RoomScoringEngine();
      const norm = engine.normalizeWeights(weights);

      const splitVertical = w < 520 || h >= 410;
      const radarAreaH = splitVertical ? Math.floor((h - 68) * 0.62) : h - 68;
      const radarAreaW = splitVertical ? w : Math.floor(w * 0.56);

      const cx = x + radarAreaW * 0.5;
      const cy = y + 58 + radarAreaH * 0.5;
      const radius = Math.max(44, Math.min(radarAreaW * 0.30, radarAreaH * 0.34));

      const axes = [
        { key: 'price', label: `가격 (${norm.percents.price}%)`, angle: -Math.PI / 2 },
        { key: 'distance', label: `거리 (${norm.percents.distance}%)`, angle: 0 },
        { key: 'area', label: `면적 (${norm.percents.area}%)`, angle: Math.PI / 2 },
        { key: 'option', label: `옵션 (${norm.percents.option}%)`, angle: Math.PI },
      ];

      // 동심 다각형 그리드 (25, 50, 75, 100)
      for (let ring = 1; ring <= 4; ring += 1) {
        const r = (radius * ring) / 4;
        window.noFill();
        window.stroke(ring === 4 ? 203 : 226, ring === 4 ? 213 : 232, ring === 4 ? 225 : 240);
        window.strokeWeight(1);
        window.beginShape();
        for (const axis of axes) {
          window.vertex(cx + Math.cos(axis.angle) * r, cy + Math.sin(axis.angle) * r);
        }
        window.endShape(window.CLOSE);

        // 눈금 숫자
        window.noStroke();
        window.fill(148, 163, 184);
        window.textSize(10);
        window.textAlign(window.LEFT, window.CENTER);
        window.text(String(ring * 25), cx + 4, cy - r + 2);
      }

      // 축 선 및 라벨
      for (let i = 0; i < axes.length; i += 1) {
        const axis = axes[i];
        const ex = cx + Math.cos(axis.angle) * radius;
        const ey = cy + Math.sin(axis.angle) * radius;
        window.stroke(226, 232, 240);
        window.strokeWeight(1);
        window.line(cx, cy, ex, ey);

        const lx = cx + Math.cos(axis.angle) * (radius + 20);
        const ly = cy + Math.sin(axis.angle) * (radius + 18);
        window.noStroke();
        window.fill(this.hoveredAxisIndex === i ? 37 : 51, this.hoveredAxisIndex === i ? 99 : 65, this.hoveredAxisIndex === i ? 235 : 85);
        window.textSize(11);
        window.textStyle(window.BOLD);
        if (i === 0) window.textAlign(window.CENTER, window.BOTTOM);
        else if (i === 1) window.textAlign(window.LEFT, window.CENTER);
        else if (i === 2) window.textAlign(window.CENTER, window.TOP);
        else window.textAlign(window.RIGHT, window.CENTER);
        window.text(axis.label, lx, ly);
      }
      window.textStyle(window.NORMAL);

      // 선택/호버된 매물이 마지막에 그려지도록 순서 정렬
      const drawOrder = [...rankedResults].sort((a, b) => {
        const aFocus = a.property.id === selectedId || a.property.id === this.hoveredPropertyId ? 1 : 0;
        const bFocus = b.property.id === selectedId || b.property.id === this.hoveredPropertyId ? 1 : 0;
        return aFocus - bFocus;
      });

      for (const item of drawOrder) {
        const id = item.property.id;
        const anim = this.animatedScores[id] || item.subScores;
        const [r, g, b] = this.hexToRgbArray(item.property.color);
        const isSelected = id === selectedId;
        const isHovered = id === this.hoveredPropertyId;
        const hasFocus = Boolean(this.hoveredPropertyId);
        const alphaFill = isHovered ? 72 : isSelected ? 48 : hasFocus ? 16 : 28;
        const alphaStroke = isHovered || isSelected ? 245 : hasFocus ? 80 : 185;

        window.fill(r, g, b, alphaFill);
        window.stroke(r, g, b, alphaStroke);
        window.strokeWeight(isHovered || isSelected ? 2.6 : 1.5);
        window.beginShape();

        const vertexCoords = [];
        for (let i = 0; i < axes.length; i += 1) {
          const axis = axes[i];
          const val = Math.max(0, Math.min(100, anim[axis.key] || 0));
          const dist = (radius * val) / 100;
          const vx = cx + Math.cos(axis.angle) * dist;
          const vy = cy + Math.sin(axis.angle) * dist;
          window.vertex(vx, vy);
          vertexCoords.push({ vx, vy, axisIndex: i });
        }
        window.endShape(window.CLOSE);

        // 꼭짓점 포인트 및 히트 영역 등록
        for (const pt of vertexCoords) {
          const dotSize = isHovered || isSelected ? 8 : 5.5;
          window.fill(255);
          window.stroke(r, g, b, alphaStroke);
          window.strokeWeight(2);
          window.circle(pt.vx, pt.vy, dotSize);

          this.hitTargets.radarPoints.push({
            id,
            x: pt.vx,
            y: pt.vy,
            r: 12,
            axisIndex: pt.axisIndex,
          });
        }
      }

      // 하단 또는 우측 종합 점수 비교 막대 그래프
      const barBoxX = splitVertical ? x + 18 : x + radarAreaW + 10;
      const barBoxY = splitVertical ? y + 66 + radarAreaH : y + 64;
      const barBoxW = splitVertical ? w - 36 : w - radarAreaW - 28;
      const barBoxH = splitVertical ? h - (barBoxY - y) - 14 : h - 80;

      this.drawScoreBarSection(barBoxX, barBoxY, barBoxW, barBoxH, rankedResults, selectedId);
      window.pop();
    }

    /**
     * @function drawScoreBarSection
     * @description 레이더 차트 영역 내부에 매물별 가중 종합 점수 수평 막대 비교 그래프를 그립니다.
     * @param {number} x - 영역 X
     * @param {number} y - 영역 Y
     * @param {number} w - 영역 너비
     * @param {number} h - 영역 높이
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과
     * @param {string} selectedId - 선택된 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    drawScoreBarSection(x, y, w, h, rankedResults, selectedId) {
      window.stroke(241, 245, 249);
      window.strokeWeight(1);
      window.line(x, y - 6, x + w, y - 6);

      window.noStroke();
      window.fill(71, 85, 105);
      window.textSize(11);
      window.textStyle(window.BOLD);
      window.textAlign(window.LEFT, window.TOP);
      window.text('종합 점수 순위 비교 (100점 만점)', x, y);
      window.textStyle(window.NORMAL);

      const maxRows = Math.min(rankedResults.length, Math.max(2, Math.floor((h - 22) / 28)));
      const rowH = Math.min(32, Math.floor((h - 24) / Math.max(1, maxRows)));

      for (let i = 0; i < maxRows; i += 1) {
        const item = rankedResults[i];
        const id = item.property.id;
        const anim = this.animatedScores[id] || { total: item.totalScore };
        const [r, g, b] = this.hexToRgbArray(item.property.color);
        const rowY = y + 22 + i * rowH;
        const isSelected = id === selectedId;
        const isHovered = id === this.hoveredPropertyId;

        if (isSelected || isHovered) {
          window.fill(241, 245, 249);
          window.noStroke();
          window.rect(x - 6, rowY - 2, w + 12, rowH - 3, 6);
        }

        // 순위 + 매물명 (실제 픽셀 너비 기준으로 잘라 막대와 겹치지 않도록 보장)
        const labelColW = Math.min(156, Math.max(112, Math.floor(w * 0.44)));
        const scoreColW = 44;
        const maxLabelPx = labelColW - 22;

        window.noStroke();
        window.fill(r, g, b);
        window.circle(x + 6, rowY + rowH * 0.42, 8);

        window.fill(15, 23, 42);
        window.textSize(12);
        window.textStyle(isSelected ? window.BOLD : window.NORMAL);
        window.textAlign(window.LEFT, window.CENTER);

        let label = `${item.rank}위 ${item.property.name}`;
        while (label.length > 3 && window.textWidth(label) > maxLabelPx) {
          label = label.slice(0, -2) + '…';
        }
        window.text(label, x + 16, rowY + rowH * 0.42);

        // 막대 트랙
        const trackX = x + labelColW;
        const trackW = Math.max(40, w - labelColW - scoreColW);
        const trackY = rowY + rowH * 0.42 - 5;

        window.fill(241, 245, 249);
        window.rect(trackX, trackY, trackW, 10, 5);

        const fillW = Math.max(6, (trackW * Math.min(100, anim.total)) / 100);
        window.fill(r, g, b, isSelected || isHovered ? 245 : 205);
        window.rect(trackX, trackY, fillW, 10, 5);

        // 점수 수치
        window.fill(15, 23, 42);
        window.textAlign(window.RIGHT, window.CENTER);
        window.textStyle(window.BOLD);
        window.text(`${item.totalScore.toFixed(1)}`, x + w, rowY + rowH * 0.42);
        window.textStyle(window.NORMAL);

        this.hitTargets.scoreBars.push({
          id,
          x: x - 6,
          y: rowY - 2,
          w: w + 12,
          h: rowH - 2,
        });
      }
    }

    /**
     * @function drawCampusMapPanel
     * @description 오른쪽/하단 패널에 캠퍼스 정문·지하철역·상권 도로망과 드래그 가능한 매물 위치 핀을 그립니다.
     * 핀을 드래그하면 학교 정문까지의 도보 시간(분)이 실시간으로 재계산됩니다.
     * @param {number} x - 패널 시작 X
     * @param {number} y - 패널 시작 Y
     * @param {number} w - 패널 너비
     * @param {number} h - 패널 높이
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과
     * @param {string} selectedId - 선택된 매물 ID
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    drawCampusMapPanel(x, y, w, h, rankedResults, selectedId) {
      window.push();
      // 카드 외곽
      window.fill(255);
      window.stroke(226, 232, 240);
      window.strokeWeight(1);
      window.rect(x, y, w, h, 12);

      // 헤더
      window.noStroke();
      window.fill(15, 23, 42);
      window.textAlign(window.LEFT, window.TOP);
      window.textSize(14);
      window.textStyle(window.BOLD);
      window.text('캠퍼스 주변 위치 지도 (핀 드래그 가능)', x + 18, y + 14);

      window.textStyle(window.NORMAL);
      window.fill(100, 116, 139);
      window.textSize(11);
      const mapSubtitle = w >= 420
        ? '매물 핀을 드래그해 실제 위치를 조정하면 도보 시간과 점수가 자동 반영됩니다.'
        : '핀을 드래그하면 도보 시간과 점수가 재계산됩니다.';
      window.text(mapSubtitle, x + 18, y + 34, w - 36);

      const mx = x + 16;
      const my = y + 58;
      const mw = w - 32;
      const mh = h - 74;
      this.lastMapRect = { x: mx, y: my, w: mw, h: mh };

      // 지도 배경
      window.fill(241, 245, 249);
      window.stroke(226, 232, 240);
      window.strokeWeight(1);
      window.rect(mx, my, mw, mh, 10);

      // 클리핑 대체용 안전한 내부 좌표 계산
      const campusPx = mx + mw * 0.5;
      const campusPy = my + mh * 0.52;

      // 도로 그리드 라인
      window.stroke(255, 255, 255, 220);
      window.strokeWeight(6);
      window.line(mx + 4, my + mh * 0.42, mx + mw - 4, my + mh * 0.42);
      window.line(mx + mw * 0.5, my + 4, mx + mw * 0.5, my + mh - 4);
      window.strokeWeight(3);
      window.line(mx + 4, my + mh * 0.72, mx + mw - 4, my + mh * 0.68);
      window.line(mx + mw * 0.24, my + 4, mx + mw * 0.28, my + mh - 4);
      window.line(mx + mw * 0.76, my + 4, mx + mw * 0.74, my + mh - 4);

      // 도보 시간 동심원 (5분, 10분, 15분) - 라벨을 우측 하단 축에 배치하여 핀 겹침 방지
      const rings = [
        { min: '5분', ratio: 0.16 },
        { min: '10분', ratio: 0.30 },
        { min: '15분', ratio: 0.44 },
      ];
      const baseDim = Math.min(mw, mh);
      for (const ring of rings) {
        const radiusR = baseDim * ring.ratio;
        const diam = radiusR * 2;
        window.noFill();
        window.stroke(148, 163, 184, 115);
        window.strokeWeight(1);
        window.drawingContext.setLineDash([4, 4]);
        window.circle(campusPx, campusPy, diam);
        window.drawingContext.setLineDash([]);

        window.noStroke();
        window.fill(100, 116, 139);
        window.textSize(10);
        window.textAlign(window.LEFT, window.TOP);
        const rx = campusPx + Math.cos(Math.PI / 4) * radiusR + 3;
        const ry = campusPy + Math.sin(Math.PI / 4) * radiusR + 2;
        window.text(ring.min, rx, ry);
      }

      // 랜드마크: 지하철역 & 대학 상권
      const stationX = mx + mw * 0.82;
      const stationY = my + mh * 0.22;
      window.fill(224, 242, 254);
      window.stroke(56, 189, 248);
      window.strokeWeight(1.5);
      window.rect(stationX - 38, stationY - 12, 76, 24, 6);
      window.noStroke();
      window.fill(3, 105, 161);
      window.textSize(10);
      window.textStyle(window.BOLD);
      window.textAlign(window.CENTER, window.CENTER);
      window.text('지하철역', stationX, stationY);

      // 랜드마크: 캠퍼스 정문 (중심)
      window.fill(15, 23, 42);
      window.stroke(255);
      window.strokeWeight(2);
      window.rect(campusPx - 44, campusPy - 14, 88, 28, 7);
      window.noStroke();
      window.fill(255);
      window.textSize(11);
      window.text('우리 대학 정문', campusPx, campusPy);
      window.textStyle(window.NORMAL);

      // 선택된 매물과 캠퍼스 연결선 먼저 그리기
      for (const item of rankedResults) {
        const p = item.property;
        const px = mx + (p.mapX !== undefined ? p.mapX : 0.35) * mw;
        const py = my + (p.mapY !== undefined ? p.mapY : 0.35) * mh;
        const isFocus = p.id === selectedId || p.id === this.hoveredPropertyId;
        if (isFocus) {
          const [r, g, b] = this.hexToRgbArray(p.color);
          window.stroke(r, g, b, 170);
          window.strokeWeight(2);
          window.drawingContext.setLineDash([5, 4]);
          window.line(campusPx, campusPy, px, py);
          window.drawingContext.setLineDash([]);
        }
      }

      // 매물 핀 그리기
      for (const item of rankedResults) {
        const p = item.property;
        const px = mx + (p.mapX !== undefined ? p.mapX : 0.35) * mw;
        const py = my + (p.mapY !== undefined ? p.mapY : 0.35) * mh;
        const [r, g, b] = this.hexToRgbArray(p.color);
        const isSelected = p.id === selectedId;
        const isHovered = p.id === this.hoveredPropertyId;
        const isDragging = p.id === this.draggingPropertyId;

        if (isSelected || isHovered) {
          const pulse = 26 + Math.sin(this.pulsePhase) * 4;
          window.noFill();
          window.stroke(r, g, b, 90);
          window.strokeWeight(2);
          window.circle(px, py, pulse);
        }

        // 핀 본체
        const pinR = isDragging ? 15 : isSelected || isHovered ? 13 : 11;
        window.fill(r, g, b);
        window.stroke(255);
        window.strokeWeight(2.5);
        window.circle(px, py, pinR * 2);

        // 순위 숫자
        window.noStroke();
        window.fill(255);
        window.textSize(11);
        window.textStyle(window.BOLD);
        window.textAlign(window.CENTER, window.CENTER);
        window.text(String(item.rank), px, py);

        // 핀 라벨 (매물명 + 도보 분)
        const tagText = `${p.name} (${p.distanceMinutes}분)`;
        window.textSize(10.5);
        const tagW = Math.min(165, window.textWidth(tagText) + 14);
        const tagX = Math.max(mx + 6, Math.min(mx + mw - tagW - 6, px - tagW / 2));
        const tagY = py + pinR + 4 < my + mh - 22 ? py + pinR + 4 : py - pinR - 22;

        window.fill(255, 255, 255, 238);
        window.stroke(isSelected ? r : 203, isSelected ? g : 213, isSelected ? b : 225);
        window.strokeWeight(isSelected ? 1.5 : 1);
        window.rect(tagX, tagY, tagW, 19, 5);

        window.noStroke();
        window.fill(15, 23, 42);
        window.textAlign(window.CENTER, window.CENTER);
        window.textStyle(isSelected ? window.BOLD : window.NORMAL);
        window.text(tagText, tagX + tagW / 2, tagY + 9.5);

        this.hitTargets.mapPins.push({
          id: p.id,
          x: px,
          y: py,
          r: pinR + 5,
        });
      }

      window.pop();
    }

    /**
     * @function drawTooltipOverlay
     * @description 마우스가 호버된 매물이 있을 경우 캔버스 우측 상단에 깔끔한 수치 요약 툴팁을 렌더링합니다.
     * @param {number} w - 캔버스 너비
     * @param {number} h - 캔버스 높이
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    drawTooltipOverlay(w, h, rankedResults) {
      if (!this.hoveredPropertyId || this.draggingPropertyId) return;
      const target = rankedResults.find((r) => r.property.id === this.hoveredPropertyId);
      if (!target) return;

      const p = target.property;
      const [cr, cg, cb] = this.hexToRgbArray(p.color);

      window.push();
      const boxW = Math.min(256, w - 32);
      const boxH = 88;
      let tx = window.mouseX + 14;
      let ty = window.mouseY - boxH - 10;
      if (tx + boxW > w - 12) tx = window.mouseX - boxW - 14;
      if (tx < 12) tx = 12;
      if (ty < 12) ty = window.mouseY + 18;
      if (ty + boxH > h - 12) ty = h - boxH - 12;

      window.fill(15, 23, 42, 240);
      window.stroke(cr, cg, cb);
      window.strokeWeight(1.5);
      window.rect(tx, ty, boxW, boxH, 8);

      window.noStroke();
      window.fill(255);
      window.textAlign(window.LEFT, window.TOP);
      window.textSize(12);
      window.textStyle(window.BOLD);
      window.text(`${target.rank}위 · ${p.name} (${target.totalScore}점)`, tx + 12, ty + 10);

      window.textStyle(window.NORMAL);
      window.fill(203, 213, 225);
      window.textSize(11);
      window.text(
        `보증금 ${p.deposit} · 월 ${target.directMonthlyCost}만원 · 도보 ${p.distanceMinutes}분 · ${p.areaPyeong}평`,
        tx + 12,
        ty + 31
      );
      window.fill(148, 163, 184);
      window.textSize(10.5);
      window.text(
        `가격 ${target.subScores.price} · 거리 ${target.subScores.distance} · 면적 ${target.subScores.area} · 옵션 ${target.subScores.option}`,
        tx + 12,
        ty + 50
      );
      window.fill(125, 211, 252);
      window.text('클릭하여 선택 · 지도 핀은 드래그 가능', tx + 12, ty + 67);
      window.pop();
    }

    /**
     * @function updateCursorState
     * @description 현재 호버 또는 드래그 대상에 따라 캔버스 마우스 커서 모양을 변경합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    updateCursorState() {
      const canvasEl = document.querySelector('#p5-canvas-container canvas');
      if (!canvasEl) return;
      if (this.draggingPropertyId) {
        canvasEl.style.cursor = 'grabbing';
      } else if (this.hoveredMapPin()) {
        canvasEl.style.cursor = 'grab';
      } else if (this.hoveredPropertyId) {
        canvasEl.style.cursor = 'pointer';
      } else {
        canvasEl.style.cursor = 'default';
      }
    }

    /**
     * @function hoveredMapPin
     * @description 현재 마우스 좌표 아래에 지도 핀이 있는지 확인하여 해당 핀 객체를 반환합니다.
     * @returns {Object|null} 히트된 핀 정보 또는 null
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    hoveredMapPin() {
      const mx = window.mouseX;
      const my = window.mouseY;
      for (let i = this.hitTargets.mapPins.length - 1; i >= 0; i -= 1) {
        const pin = this.hitTargets.mapPins[i];
        const d = Math.hypot(mx - pin.x, my - pin.y);
        if (d <= pin.r) return pin;
      }
      return null;
    }

    /**
     * @function handleMouseMoved
     * @description 캔버스 위에서 마우스 이동 시 핀, 레이더 꼭짓점, 막대 그래프 히트 테스트를 수행합니다.
     * @param {number} mx - 마우스 X 좌표
     * @param {number} my - 마우스 Y 좌표
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    handleMouseMoved(mx, my) {
      if (this.draggingPropertyId) return;

      let foundId = null;
      let foundAxis = -1;

      for (let i = this.hitTargets.mapPins.length - 1; i >= 0; i -= 1) {
        const pin = this.hitTargets.mapPins[i];
        if (Math.hypot(mx - pin.x, my - pin.y) <= pin.r) {
          foundId = pin.id;
          break;
        }
      }

      if (!foundId) {
        for (let i = this.hitTargets.radarPoints.length - 1; i >= 0; i -= 1) {
          const pt = this.hitTargets.radarPoints[i];
          if (Math.hypot(mx - pt.x, my - pt.y) <= pt.r) {
            foundId = pt.id;
            foundAxis = pt.axisIndex;
            break;
          }
        }
      }

      if (!foundId) {
        for (const bar of this.hitTargets.scoreBars) {
          if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
            foundId = bar.id;
            break;
          }
        }
      }

      this.hoveredPropertyId = foundId;
      this.hoveredAxisIndex = foundAxis;
    }

    /**
     * @function handleMousePressed
     * @description 캔버스 클릭/마우스 다운 시 핀 드래그 시작 또는 매물 선택 콜백을 실행합니다.
     * @param {number} mx - 마우스 X 좌표
     * @param {number} my - 마우스 Y 좌표
     * @returns {boolean} 캔버스 내부 대상이 클릭되었는지 여부
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    handleMousePressed(mx, my) {
      for (let i = this.hitTargets.mapPins.length - 1; i >= 0; i -= 1) {
        const pin = this.hitTargets.mapPins[i];
        if (Math.hypot(mx - pin.x, my - pin.y) <= pin.r) {
          this.draggingPropertyId = pin.id;
          this.dragOffset = { x: pin.x - mx, y: pin.y - my };
          if (this.callbacks.onSelectProperty) {
            this.callbacks.onSelectProperty(pin.id);
          }
          return true;
        }
      }

      for (let i = this.hitTargets.radarPoints.length - 1; i >= 0; i -= 1) {
        const pt = this.hitTargets.radarPoints[i];
        if (Math.hypot(mx - pt.x, my - pt.y) <= pt.r) {
          if (this.callbacks.onSelectProperty) {
            this.callbacks.onSelectProperty(pt.id);
          }
          return true;
        }
      }

      for (const bar of this.hitTargets.scoreBars) {
        if (mx >= bar.x && mx <= bar.x + bar.w && my >= bar.y && my <= bar.y + bar.h) {
          if (this.callbacks.onSelectProperty) {
            this.callbacks.onSelectProperty(bar.id);
          }
          return true;
        }
      }

      return false;
    }

    /**
     * @function handleMouseDragged
     * @description 핀을 드래그하는 동안 지도 내 정규화 좌표를 계산해 실시간으로 위치 및 도보 거리를 갱신합니다.
     * @param {number} mx - 마우스 X 좌표
     * @param {number} my - 마우스 Y 좌표
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    handleMouseDragged(mx, my) {
      if (!this.draggingPropertyId || !this.lastMapRect) return;
      const rect = this.lastMapRect;
      const nx = Math.max(0.06, Math.min(0.94, (mx + this.dragOffset.x - rect.x) / rect.w));
      const ny = Math.max(0.08, Math.min(0.92, (my + this.dragOffset.y - rect.y) / rect.h));

      if (this.callbacks.onMovePin) {
        this.callbacks.onMovePin(this.draggingPropertyId, nx, ny, false);
      }
    }

    /**
     * @function handleMouseReleased
     * @description 드래그 종료 시 최종 핀 위치를 저장소에 영구 반영합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    handleMouseReleased() {
      if (this.draggingPropertyId) {
        const movedId = this.draggingPropertyId;
        this.draggingPropertyId = null;
        if (this.callbacks.onFinishMovePin) {
          this.callbacks.onFinishMovePin(movedId);
        }
      }
    }

    /**
     * @function createExportSummaryGraphics
     * @description 최종 결과물 PNG 다운로드를 위해 p5.Graphics 버퍼(1280x860)에
     * 순위표, 레이더 차트, 체크리스트 요약, 방문 일정을 깔끔한 리포트 카드 형태로 그립니다.
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과 배열
     * @param {Object} weights - 현재 가중치
     * @param {Array<Object>} visits - 방문 일정 목록
     * @returns {Object} 생성된 p5.Graphics 버퍼
     * @ai-assisted AI의 도움을 받아 p5.Graphics 오프스크린 리포트 렌더링으로 작성되었습니다.
     */
    createExportSummaryGraphics(rankedResults, weights, visits) {
      const g = window.createGraphics(1280, 860);
      const engine = new root.RoomScoring.RoomScoringEngine();
      const norm = engine.normalizeWeights(weights);

      g.background(248, 250, 252);

      // 상단 헤더 바
      g.fill(15, 23, 42);
      g.noStroke();
      g.rect(0, 0, 1280, 96);
      g.fill(255);
      g.textAlign(g.LEFT, g.TOP);
      g.textSize(26);
      g.textStyle(g.BOLD);
      g.text('자취방 선택 도우미 · 최종 비교 결과 리포트', 40, 24);
      g.textStyle(g.NORMAL);
      g.fill(203, 213, 225);
      g.textSize(13);
      g.text(
        `생성일: ${new Date().toLocaleDateString('ko-KR')}  |  적용 가중치: 가격 ${norm.percents.price}% · 거리 ${norm.percents.distance}% · 면적 ${norm.percents.area}% · 옵션 ${norm.percents.option}%`,
        40,
        60
      );

      // 왼쪽 영역: 레이더 차트
      g.fill(255);
      g.stroke(226, 232, 240);
      g.strokeWeight(1);
      g.rect(40, 120, 460, 470, 12);

      g.noStroke();
      g.fill(15, 23, 42);
      g.textSize(16);
      g.textStyle(g.BOLD);
      g.text('매물별 4축 밸런스 비교', 64, 144);
      g.textStyle(g.NORMAL);

      const cx = 270;
      const cy = 365;
      const rad = 138;
      const axes = [
        { key: 'price', label: '가격', angle: -Math.PI / 2 },
        { key: 'distance', label: '거리', angle: 0 },
        { key: 'area', label: '면적', angle: Math.PI / 2 },
        { key: 'option', label: '옵션', angle: Math.PI },
      ];

      for (let ring = 1; ring <= 4; ring += 1) {
        const rr = (rad * ring) / 4;
        g.noFill();
        g.stroke(226, 232, 240);
        g.beginShape();
        axes.forEach((a) => g.vertex(cx + Math.cos(a.angle) * rr, cy + Math.sin(a.angle) * rr));
        g.endShape(g.CLOSE);
      }

      axes.forEach((a, idx) => {
        g.stroke(226, 232, 240);
        g.line(cx, cy, cx + Math.cos(a.angle) * rad, cy + Math.sin(a.angle) * rad);
        g.noStroke();
        g.fill(51, 65, 85);
        g.textSize(13);
        g.textStyle(g.BOLD);
        const lx = cx + Math.cos(a.angle) * (rad + 22);
        const ly = cy + Math.sin(a.angle) * (rad + 20);
        if (idx === 0) g.textAlign(g.CENTER, g.BOTTOM);
        else if (idx === 1) g.textAlign(g.LEFT, g.CENTER);
        else if (idx === 2) g.textAlign(g.CENTER, g.TOP);
        else g.textAlign(g.RIGHT, g.CENTER);
        g.text(a.label, lx, ly);
      });
      g.textStyle(g.NORMAL);

      rankedResults.forEach((item) => {
        const [r, gr, b] = this.hexToRgbArray(item.property.color);
        g.fill(r, gr, b, 34);
        g.stroke(r, gr, b, 220);
        g.strokeWeight(2.2);
        g.beginShape();
        axes.forEach((a) => {
          const d = (rad * item.subScores[a.key]) / 100;
          g.vertex(cx + Math.cos(a.angle) * d, cy + Math.sin(a.angle) * d);
        });
        g.endShape(g.CLOSE);
      });

      // 오른쪽 영역: 종합 추천 순위 및 체크리스트 요약
      g.fill(255);
      g.stroke(226, 232, 240);
      g.strokeWeight(1);
      g.rect(524, 120, 716, 470, 12);

      g.noStroke();
      g.fill(15, 23, 42);
      g.textAlign(g.LEFT, g.TOP);
      g.textSize(16);
      g.textStyle(g.BOLD);
      g.text('최종 매물 추천 순위 & 현장 체크리스트 요약', 548, 144);
      g.textStyle(g.NORMAL);

      const displayList = rankedResults.slice(0, 5);
      displayList.forEach((item, idx) => {
        const p = item.property;
        const [r, gr, b] = this.hexToRgbArray(p.color);
        const ry = 186 + idx * 78;

        g.fill(248, 250, 252);
        g.stroke(226, 232, 240);
        g.rect(548, ry, 668, 66, 8);

        g.noStroke();
        g.fill(r, gr, b);
        g.circle(572, ry + 33, 24);
        g.fill(255);
        g.textAlign(g.CENTER, g.CENTER);
        g.textSize(12);
        g.textStyle(g.BOLD);
        g.text(String(item.rank), 572, ry + 33);

        g.textAlign(g.LEFT, g.TOP);
        g.fill(15, 23, 42);
        g.textSize(14);
        g.text(`${p.name} (${p.roomType || '원룸'})`, 598, ry + 12);

        g.textStyle(g.NORMAL);
        g.fill(71, 85, 105);
        g.textSize(12);
        g.text(
          `보증금 ${p.deposit} · 월 지출 ${item.directMonthlyCost}만원 · 도보 ${p.distanceMinutes}분 · ${p.areaPyeong}평 · ★${p.rating || 0}`,
          598,
          ry + 36
        );

        g.textAlign(g.RIGHT, g.TOP);
        g.fill(r, gr, b);
        g.textSize(16);
        g.textStyle(g.BOLD);
        g.text(`${item.totalScore.toFixed(1)}점`, 1196, ry + 12);

        g.textStyle(g.NORMAL);
        g.fill(item.checklistStats.warn > 0 ? 217 : 22, item.checklistStats.warn > 0 ? 119 : 163, item.checklistStats.warn > 0 ? 6 : 74);
        g.textSize(12);
        g.text(
          `점검 ${item.checklistStats.completionRate}% (양호 ${item.checklistStats.good} · 주의 ${item.checklistStats.warn})`,
          1196,
          ry + 36
        );
      });

      // 하단 영역: 예정된 현장 방문 일정
      g.fill(255);
      g.stroke(226, 232, 240);
      g.strokeWeight(1);
      g.rect(40, 614, 1200, 198, 12);

      g.noStroke();
      g.fill(15, 23, 42);
      g.textAlign(g.LEFT, g.TOP);
      g.textSize(16);
      g.textStyle(g.BOLD);
      g.text('등록된 현장 방문 일정', 64, 636);
      g.textStyle(g.NORMAL);

      const propNames = {};
      rankedResults.forEach((r) => {
        propNames[r.property.id] = r.property.name;
      });
      const sortedVisits = root.CalendarUtils ? root.CalendarUtils.sortVisits(visits) : visits;
      const topVisits = (sortedVisits || []).slice(0, 4);

      if (!topVisits.length) {
        g.fill(100, 116, 139);
        g.textSize(13);
        g.text('등록된 현장 방문 일정이 없습니다.', 64, 676);
      } else {
        topVisits.forEach((v, idx) => {
          const vy = 674 + idx * 30;
          g.fill(15, 23, 42);
          g.textSize(13);
          const status = v.completed ? '[완료]' : '[예정]';
          g.text(
            `${v.date} ${v.time || ''}  ${status}  ${propNames[v.propertyId] || '매물'} — ${v.memo || '메모 없음'}`,
            64,
            vy
          );
        });
      }

      g.fill(148, 163, 184);
      g.textSize(11);
      g.text('제작: 최지원 · 김세정 · 김수현 · 배지은  |  자취방 선택 도우미 (p5.js Project)', 40, 826);

      return g;
    }
  }

  root.RoomCanvasVisualizer = RoomCanvasVisualizer;
})(typeof globalThis !== 'undefined' ? globalThis : this);
