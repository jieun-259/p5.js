/**
 * @fileoverview 최종 평가 순위 및 체크리스트 요약 결과물 내보내기(PNG / 리포트 파일) 모듈
 * @ai-assisted 본 파일의 클래스 및 함수는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * p5.js saveCanvas() 기반 PNG 이미지 생성과 텍스트 리포트 다운로드 기능을 제공합니다.
 */

(function (root) {
  'use strict';

  /**
   * @class ReportExporter
   * @description 비교 평가 결과(순위, 점수, 체크리스트 현황, 방문 일정)를
   * p5.js 캔버스 PNG 이미지(saveCanvas 활용) 또는 요약 텍스트 리포트(.txt)로 내보내는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 p5.Graphics 리포트 렌더링 및 Blob 다운로드 로직으로 작성되었습니다.
   */
  class ReportExporter {
    /**
     * @function exportPngViaP5
     * @description p5.js의 saveCanvas() 함수를 활용하여 현재 비교 차트 및 최종 순위 요약 보드를
     * 고해상도 PNG 이미지 파일로 다운로드합니다.
     * @param {Object} p5Context - 전역 p5 인스턴스 또는 saveCanvas 함수
     * @param {Object} visualizer - RoomCanvasVisualizer 인스턴스
     * @param {Array<Object>} rankedResults - rankProperties()로 정렬된 평가 결과 배열
     * @param {Object} weights - 현재 가중치 객체
     * @param {Array<Object>} visits - 방문 일정 목록
     * @returns {boolean} 내보내기 성공 여부
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    exportPngViaP5(visualizer, rankedResults, weights, visits) {
      try {
        if (typeof window.createGraphics === 'function' && typeof window.saveCanvas === 'function') {
          const reportGraphic = visualizer.createExportSummaryGraphics(rankedResults, weights, visits);
          if (reportGraphic) {
            window.saveCanvas(reportGraphic, '자취방_비교_결과_리포트', 'png');
            reportGraphic.remove();
            return true;
          }
        }
        if (typeof window.saveCanvas === 'function') {
          window.saveCanvas('자취방_비교_캔버스', 'png');
          return true;
        }
        return false;
      } catch (err) {
        console.error('PNG 내보내기 중 오류 발생:', err);
        return false;
      }
    }

    /**
     * @function buildTextReport
     * @description 순위, 세부 점수, 체크리스트 상태, 별점·메모, 방문 일정을 포함한
     * 읽기 쉬운 요약 리포트 문자열을 생성합니다.
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과
     * @param {Object} weights - 가중치 설정
     * @param {Array<Object>} visits - 방문 일정 목록
     * @returns {string} UTF-8 요약 리포트 본문
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    buildTextReport(rankedResults, weights, visits) {
      const now = new Date();
      const dateStr = now.toLocaleString('ko-KR');
      const engine = new root.RoomScoring.RoomScoringEngine();
      const norm = engine.normalizeWeights(weights);
      const defs = root.CHECKLIST_DEFINITIONS || [];

      const lines = [];
      lines.push('============================================================');
      lines.push('              자취방 선택 도우미 - 최종 비교 리포트');
      lines.push('============================================================');
      lines.push(`생성 일시: ${dateStr}`);
      lines.push(
        `적용 가중치: 가격 ${norm.percents.price}% · 거리 ${norm.percents.distance}% · 면적 ${norm.percents.area}% · 옵션 ${norm.percents.option}%`
      );
      lines.push('');
      lines.push('[1] 종합 추천 순위 및 매물별 평가');
      lines.push('------------------------------------------------------------');

      if (!rankedResults.length) {
        lines.push('등록된 매물이 없습니다.');
      } else {
        rankedResults.forEach((item) => {
          const p = item.property;
          const statusMap = { good: '양호', warn: '주의', pending: '미확인' };
          const checkSummary = defs
            .map((d) => `${d.label}: ${statusMap[(p.checklist && p.checklist[d.key]) || 'pending']}`)
            .join(' | ');

          lines.push(`${item.rank}위. ${p.name} (${p.roomType || '원룸'}) — 종합 ${item.totalScore}점`);
          lines.push(
            `   · 비용: 보증금 ${p.deposit}만원 / 월세 ${p.rent}만원 + 관리비 ${p.maintenanceFee}만원 (월 지출 ${item.directMonthlyCost}만원)`
          );
          lines.push(`   · 조건: 학교 도보 ${p.distanceMinutes}분 / 전용 ${p.areaPyeong}평 / 별점 ★${p.rating || 0}`);
          lines.push(
            `   · 항목 점수: 가격 ${item.subScores.price} · 거리 ${item.subScores.distance} · 면적 ${item.subScores.area} · 옵션 ${item.subScores.option}`
          );
          lines.push(`   · 보유 옵션: ${(p.options || []).join(', ') || '없음'}`);
          lines.push(`   · 현장 체크(${item.checklistStats.completionRate}% 완료): ${checkSummary}`);
          if (p.memo) {
            lines.push(`   · 현장 메모: ${p.memo.replace(/\n+/g, ' ')}`);
          }
          lines.push('');
        });
      }

      lines.push('[2] 등록된 현장 방문 일정');
      lines.push('------------------------------------------------------------');
      const sortedVisits = root.CalendarUtils ? root.CalendarUtils.sortVisits(visits) : visits;
      if (!sortedVisits || !sortedVisits.length) {
        lines.push('등록된 방문 일정이 없습니다.');
      } else {
        const propNameMap = {};
        rankedResults.forEach((r) => {
          propNameMap[r.property.id] = r.property.name;
        });
        sortedVisits.forEach((v) => {
          const propName = propNameMap[v.propertyId] || '삭제된 매물';
          const status = v.completed ? '방문완료' : '방문예정';
          lines.push(`- ${v.date} ${v.time || ''} | ${propName} [${status}] ${v.memo ? '- ' + v.memo : ''}`);
        });
      }

      lines.push('============================================================');
      return lines.join('\n');
    }

    /**
     * @function downloadTextReport
     * @description 생성된 요약 리포트 문자열을 UTF-8 BOM 포함 .txt 파일로 다운로드합니다.
     * @param {Array<Object>} rankedResults - 정렬된 평가 결과
     * @param {Object} weights - 가중치 객체
     * @param {Array<Object>} visits - 방문 일정 배열
     * @returns {boolean} 다운로드 실행 성공 여부
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    downloadTextReport(rankedResults, weights, visits) {
      try {
        const content = this.buildTextReport(rankedResults, weights, visits);
        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '자취방_비교_요약_리포트.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
      } catch (err) {
        console.error('요약 리포트 다운로드 오류:', err);
        return false;
      }
    }
  }

  root.ReportExporter = ReportExporter;
})(typeof globalThis !== 'undefined' ? globalThis : this);
