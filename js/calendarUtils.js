/**
 * @fileoverview 달력 그리드 생성 및 방문 일정 정렬 순수 유틸리티 모듈 (배지은 담당)
 * @ai-assisted 본 파일의 함수들은 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * 팀원(배지은)이 캘린더 월간 계산 및 일정 정렬 요구사항에 맞게 검증하였습니다.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CalendarUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * @function formatDateKey
   * @description Date 객체를 'YYYY-MM-DD' 형식의 문자열 키로 변환합니다.
   * @param {Date} date - 변환할 Date 객체
   * @returns {string} 'YYYY-MM-DD' 문자열
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * @function getRelativeDateKey
   * @description 기준 날짜(기본값: 오늘)로부터 offsetDays 만큼 떨어진 날짜의 'YYYY-MM-DD' 문자열을 반환합니다.
   * @param {number} offsetDays - 더하거나 뺄 일수
   * @param {Date} [baseDate] - 기준 날짜
   * @returns {string} 'YYYY-MM-DD' 문자열
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  function getRelativeDateKey(offsetDays, baseDate) {
    const base = baseDate ? new Date(baseDate.getTime()) : new Date();
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() + offsetDays);
    return formatDateKey(base);
  }

  /**
   * @function getMonthGrid
   * @description 지정된 연도와 월(0~11)에 대해 일요일 시작 6주(42칸) 달력 셀 배열을 생성합니다.
   * @param {number} year - 연도 (예: 2026)
   * @param {number} month - 월 인덱스 (0 = 1월, 11 = 12월)
   * @param {string} [todayKey] - 오늘 날짜 'YYYY-MM-DD' 문자열
   * @returns {Array<Object>} 42개 날짜 셀 객체 배열
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  function getMonthGrid(year, month, todayKey) {
    const referenceToday = todayKey || formatDateKey(new Date());
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const gridStartDate = new Date(year, month, 1 - startWeekday);

    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const cellDate = new Date(
        gridStartDate.getFullYear(),
        gridStartDate.getMonth(),
        gridStartDate.getDate() + i
      );
      const dateKey = formatDateKey(cellDate);
      cells.push({
        dateKey,
        day: cellDate.getDate(),
        month: cellDate.getMonth(),
        year: cellDate.getFullYear(),
        weekday: cellDate.getDay(),
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: dateKey === referenceToday,
      });
    }
    return cells;
  }

  /**
   * @function sortVisits
   * @description 방문 일정 배열을 날짜 오름차순, 동일 날짜 내 시간 오름차순으로 정렬합니다.
   * @param {Array<Object>} visits - 방문 일정 객체 배열
   * @returns {Array<Object>} 정렬된 새 방문 일정 배열
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  function sortVisits(visits) {
    if (!Array.isArray(visits)) return [];
    return [...visits].sort((a, b) => {
      const dateCmp = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCmp !== 0) return dateCmp;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });
  }

  /**
   * @function groupVisitsByDate
   * @description 방문 일정 배열을 'YYYY-MM-DD' 날짜 키별로 그룹화한 맵 객체를 생성합니다.
   * @param {Array<Object>} visits - 방문 일정 객체 배열
   * @returns {Object} 날짜별 방문 일정 배열 맵
   * @ai-assisted AI의 도움을 받아 작성되었습니다.
   */
  function groupVisitsByDate(visits) {
    const grouped = {};
    const sorted = sortVisits(visits);
    for (const visit of sorted) {
      if (!visit.date) continue;
      if (!grouped[visit.date]) {
        grouped[visit.date] = [];
      }
      grouped[visit.date].push(visit);
    }
    return grouped;
  }

  return {
    formatDateKey,
    getRelativeDateKey,
    getMonthGrid,
    sortVisits,
    groupVisitsByDate,
  };
});
