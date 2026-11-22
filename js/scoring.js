/**
 * @fileoverview 자취방 다기준 가중치 평가 및 순위 산출 순수 로직 모듈 (김수현 담당)
 * @ai-assisted 본 파일의 클래스 및 함수는 AI(생성형 AI 어시스턴트)의 도움을 받아
 * 구조화 및 작성되었으며, 팀원(김수현)이 평가 수식과 기준을 검토·확정하였습니다.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RoomScoring = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * @constant {Array<string>} ALL_OPTION_KEYS
   * 매물 등록 시 선택 가능한 전체 자취방 옵션 목록
   */
  const ALL_OPTION_KEYS = [
    '에어컨',
    '세탁기',
    '냉장고',
    '인덕션/레인지',
    '책상/옷장',
    '엘리베이터',
    '전자도어락/CCTV',
    '발코니/베란다',
  ];

  /**
   * @class RoomScoringEngine
   * @description 매물의 가격·거리·면적·옵션 데이터를 0~100점 척도로 정규화하고
   * 사용자 설정 가중치를 반영하여 종합 점수 및 추천 순위를 계산하는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 다기준 의사결정(MCDA) 정규화 로직으로 작성되었습니다.
   */
  class RoomScoringEngine {
    /**
     * @function constructor
     * @description RoomScoringEngine 인스턴스를 생성하고 기준 상수를 초기화합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    constructor() {
      this.campusCenter = { x: 0.5, y: 0.52 };
      this.maxMapMinutes = 25;
    }

    /**
     * @function clamp
     * @description 숫자를 지정된 최소(min)와 최대(max) 범위 안으로 제한합니다.
     * @param {number} value - 입력 숫자
     * @param {number} min - 최솟값
     * @param {number} max - 최댓값
     * @returns {number} 제한된 숫자
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    clamp(value, min, max) {
      const num = Number(value);
      if (Number.isNaN(num)) return min;
      return Math.max(min, Math.min(max, num));
    }

    /**
     * @function calculateMonthlyBurden
     * @description 보증금의 기회비용(연 4.8% 기준 월 0.4%)과 월세, 관리비를 합산하여
     * 실질 월 주거 부담액(만원)을 계산합니다.
     * @param {Object} property - 매물 객체 (deposit, rent, maintenanceFee 포함)
     * @returns {number} 실질 월 부담액 (만원, 소수점 1자리)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    calculateMonthlyBurden(property) {
      const deposit = Math.max(0, Number(property.deposit) || 0);
      const rent = Math.max(0, Number(property.rent) || 0);
      const fee = Math.max(0, Number(property.maintenanceFee) || 0);
      const convertedDeposit = deposit * 0.004;
      return Math.round((rent + fee + convertedDeposit) * 10) / 10;
    }

    /**
     * @function calculateDirectMonthlyCost
     * @description 보증금을 제외한 순수 월 지출액(월세 + 관리비)을 계산합니다.
     * @param {Object} property - 매물 객체
     * @returns {number} 월세 + 관리비 합계 (만원)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    calculateDirectMonthlyCost(property) {
      const rent = Math.max(0, Number(property.rent) || 0);
      const fee = Math.max(0, Number(property.maintenanceFee) || 0);
      return Math.round((rent + fee) * 10) / 10;
    }

    /**
     * @function normalizeWeights
     * @description 사용자가 슬라이더로 조절한 4가지 가중치(가격, 거리, 면적, 옵션)를
     * 합계 100% 비율(0~1 소수점 및 퍼센트)로 정규화합니다. 모두 0인 경우 균등 분배(25%)합니다.
     * @param {Object} weights - { price, distance, area, option } 원시 가중치
     * @returns {Object} 정규화된 비율 및 퍼센트 객체
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    normalizeWeights(weights) {
      const rawPrice = Math.max(0, Number(weights && weights.price) || 0);
      const rawDistance = Math.max(0, Number(weights && weights.distance) || 0);
      const rawArea = Math.max(0, Number(weights && weights.area) || 0);
      const rawOption = Math.max(0, Number(weights && weights.option) || 0);
      const sum = rawPrice + rawDistance + rawArea + rawOption;

      if (sum <= 0) {
        return {
          ratios: { price: 0.25, distance: 0.25, area: 0.25, option: 0.25 },
          percents: { price: 25, distance: 25, area: 25, option: 25 },
        };
      }

      const ratios = {
        price: rawPrice / sum,
        distance: rawDistance / sum,
        area: rawArea / sum,
        option: rawOption / sum,
      };

      const pPrice = Math.round(ratios.price * 100);
      const pDist = Math.round(ratios.distance * 100);
      const pArea = Math.round(ratios.area * 100);
      const pOpt = Math.max(0, 100 - pPrice - pDist - pArea);

      return {
        ratios,
        percents: {
          price: pPrice,
          distance: pDist,
          area: pArea,
          option: pOpt,
        },
      };
    }

    /**
     * @function scorePrice
     * @description 매물의 실질 월 부담액을 기준으로 가격(가성비) 점수(0~100)를 산출합니다.
     * 35만원 이하를 만점(100점), 100만원 이상을 최저 기준(15점)으로 선형 보간합니다.
     * @param {Object} property - 매물 객체
     * @returns {number} 가격 점수 (0~100)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    scorePrice(property) {
      const burden = this.calculateMonthlyBurden(property);
      const minBurden = 35;
      const maxBurden = 100;
      const normalized = 1 - (burden - minBurden) / (maxBurden - minBurden);
      return Math.round(this.clamp(15 + normalized * 85, 10, 100));
    }

    /**
     * @function scoreDistance
     * @description 학교까지의 도보 소요 시간(분)을 기준으로 거리 점수(0~100)를 산출합니다.
     * 도보 2분 이내 만점(100점), 25분 이상 최저 기준(10점)으로 계산합니다.
     * @param {Object} property - 매물 객체 (distanceMinutes 포함)
     * @returns {number} 거리 점수 (0~100)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    scoreDistance(property) {
      const minutes = Math.max(0, Number(property.distanceMinutes) || 0);
      const minMin = 2;
      const maxMin = 25;
      const normalized = 1 - (minutes - minMin) / (maxMin - minMin);
      return Math.round(this.clamp(10 + normalized * 90, 10, 100));
    }

    /**
     * @function scoreArea
     * @description 전용 면적(평)을 기준으로 공간 쾌적성 점수(0~100)를 산출합니다.
     * 4평 이하 최저 기준(20점), 12평 이상 만점(100점)으로 계산합니다.
     * @param {Object} property - 매물 객체 (areaPyeong 포함)
     * @returns {number} 면적 점수 (0~100)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    scoreArea(property) {
      const area = Math.max(0, Number(property.areaPyeong) || 0);
      const minArea = 4;
      const maxArea = 12;
      const normalized = (area - minArea) / (maxArea - minArea);
      return Math.round(this.clamp(20 + normalized * 80, 15, 100));
    }

    /**
     * @function scoreOptions
     * @description 보유한 자취방 옵션 개수를 전체 기준 옵션 수로 나누어 옵션 점수(0~100)를 계산합니다.
     * @param {Object} property - 매물 객체 (options 배열 포함)
     * @returns {number} 옵션 점수 (0~100)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    scoreOptions(property) {
      const opts = Array.isArray(property.options) ? property.options : [];
      const count = opts.length;
      const total = ALL_OPTION_KEYS.length;
      return Math.round(this.clamp((count / total) * 100, 10, 100));
    }

    /**
     * @function calculateChecklistStats
     * @description 현장 방문 체크리스트 항목별 상태('good', 'warn', 'pending')를 집계하여
     * 완료율 및 양호 비율을 반환합니다.
     * @param {Object} checklist - 매물별 체크리스트 상태 맵
     * @returns {Object} { total, checked, good, warn, completionRate }
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    calculateChecklistStats(checklist) {
      const items = checklist && typeof checklist === 'object' ? Object.values(checklist) : [];
      const total = items.length || 6;
      let good = 0;
      let warn = 0;
      let checked = 0;

      for (const status of items) {
        if (status === 'good') {
          good += 1;
          checked += 1;
        } else if (status === 'warn') {
          warn += 1;
          checked += 1;
        }
      }

      const completionRate = total > 0 ? Math.round((checked / total) * 100) : 0;
      return { total, checked, good, warn, completionRate };
    }

    /**
     * @function evaluateProperty
     * @description 단일 매물에 대해 4가지 세부 점수, 가중 종합 점수, 실질 월 부담액을 계산합니다.
     * @param {Object} property - 매물 데이터
     * @param {Object} weights - 가중치 객체
     * @returns {Object} 계산된 점수와 메타데이터가 포함된 평가 결과
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    evaluateProperty(property, weights) {
      const { ratios, percents } = this.normalizeWeights(weights);
      const subScores = {
        price: this.scorePrice(property),
        distance: this.scoreDistance(property),
        area: this.scoreArea(property),
        option: this.scoreOptions(property),
      };

      const totalScore =
        Math.round(
          (subScores.price * ratios.price +
            subScores.distance * ratios.distance +
            subScores.area * ratios.area +
            subScores.option * ratios.option) *
            10
        ) / 10;

      return {
        property,
        subScores,
        totalScore,
        weightPercents: percents,
        monthlyBurden: this.calculateMonthlyBurden(property),
        directMonthlyCost: this.calculateDirectMonthlyCost(property),
        checklistStats: this.calculateChecklistStats(property.checklist),
      };
    }

    /**
     * @function rankProperties
     * @description 모든 매물을 평가한 뒤 종합 점수 내림차순(동점 시 별점 높음 -> 월 지출 낮음 순)으로
     * 정렬하고 1부터 시작하는 순위(rank)를 부여합니다.
     * @param {Array<Object>} properties - 매물 배열
     * @param {Object} weights - 가중치 객체
     * @returns {Array<Object>} rank가 포함된 정렬된 평가 결과 배열
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    rankProperties(properties, weights) {
      if (!Array.isArray(properties)) return [];
      const evaluated = properties.map((prop) => this.evaluateProperty(prop, weights));
      evaluated.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        const starA = Number(a.property.rating) || 0;
        const starB = Number(b.property.rating) || 0;
        if (starB !== starA) return starB - starA;
        return a.monthlyBurden - b.monthlyBurden;
      });

      return evaluated.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
    }

    /**
     * @function calculateDistanceFromMapCoords
     * @description p5.js 인터랙티브 지도에서 핀을 드래그했을 때 캠퍼스 정문 기준 좌표를 바탕으로
     * 도보 소요 시간(분)을 실시간으로 역산합니다.
     * @param {number} mapX - 정규화된 X 좌표 (0~1)
     * @param {number} mapY - 정규화된 Y 좌표 (0~1)
     * @returns {number} 계산된 도보 소요 시간 (1~25분 정수)
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    calculateDistanceFromMapCoords(mapX, mapY) {
      const dx = mapX - this.campusCenter.x;
      const dy = mapY - this.campusCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minutes = Math.round(this.clamp(dist * 36, 1, this.maxMapMinutes));
      return minutes;
    }
  }

  return {
    ALL_OPTION_KEYS,
    RoomScoringEngine,
  };
});
