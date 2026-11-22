/**
 * @fileoverview 초기 실행용 샘플 매물 3개 및 샘플 방문 일정 데이터 생성 모듈
 * @ai-assisted 본 파일의 클래스 및 함수는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * 팀원들이 대학가 자취방 시세와 체크리스트 항목에 맞게 데이터를 검수하였습니다.
 */

(function (root) {
  'use strict';

  /**
   * @constant {Array<Object>} CHECKLIST_DEFINITIONS
   * 현장 방문 시 확인해야 하는 6가지 핵심 점검 항목 정의
   */
  const CHECKLIST_DEFINITIONS = [
    { key: 'water', label: '수압 · 배수', hint: '세면대/샤워기 동시 수압, 변기 물 내림, 온수 속도 확인' },
    { key: 'light', label: '채광 · 환기', hint: '창문 방향(남향/동향), 맞통풍 가능 여부, 앞 건물 간격' },
    { key: 'mold', label: '곰팡이 · 결로/누수', hint: '창틀 실리콘, 벽지 모서리, 화장실 천장 얼룩 확인' },
    { key: 'noise', label: '방음 · 주변 소음', hint: '복도 발소리, 옆집 벽 두드림, 외부 도로/상가 소음' },
    { key: 'options', label: '옵션 작동 · 청결', hint: '에어컨 필터, 세탁기 통 내부, 냉장고·인덕션 작동 여부' },
    { key: 'security', label: '보안 · 치안 환경', hint: '현관 도어락, CCTV 위치, 밤길 가로등 및 창문 방범창' },
  ];

  /**
   * @constant {Array<string>} PROPERTY_COLORS
   * 매물별 레이더 차트 및 지도 핀 시각화에 사용되는 고유 색상 팔레트
   */
  const PROPERTY_COLORS = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#DC2626', '#059669'];

  /**
   * @class SampleDataFactory
   * @description 최초 실행 시 사용자가 즉시 테스트할 수 있도록 3개의 샘플 자취방 매물,
   * 기본 가중치 설정, 샘플 방문 일정을 생성하는 팩토리 클래스입니다.
   * @ai-assisted AI의 도움을 받아 샘플 데이터 구조화 및 날짜 오프셋 연동 코드로 작성되었습니다.
   */
  class SampleDataFactory {
    /**
     * @function createDefaultWeights
     * @description 기본 평가 항목별 가중치(가격 35, 거리 30, 면적 20, 옵션 15)를 반환합니다.
     * @returns {Object} 기본 가중치 객체
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    createDefaultWeights() {
      return {
        price: 35,
        distance: 30,
        area: 20,
        option: 15,
      };
    }

    /**
     * @function createDefaultProperties
     * @description 대학가 대표 유형(정문 앞 원룸, 역세권 오피스텔, 후문 1.5룸 빌라)을 반영한
     * 3개의 기본 샘플 매물 배열을 생성합니다.
     * @returns {Array<Object>} 샘플 매물 목록
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    createDefaultProperties() {
      return [
        {
          id: 'prop-sample-1',
          name: '정문 앞 햇살 원룸',
          roomType: '분리형 원룸 · 3층',
          addressHint: '대학 정문 도보 4분 거리',
          deposit: 500,
          rent: 46,
          maintenanceFee: 5,
          distanceMinutes: 4,
          areaPyeong: 6.5,
          options: ['에어컨', '세탁기', '냉장고', '인덕션/레인지', '책상/옷장', '전자도어락/CCTV'],
          photos: ['./src/assets/images/sample_room_sunny_1795341124410.jpg'],
          color: PROPERTY_COLORS[0],
          mapX: 0.42,
          mapY: 0.39,
          rating: 4.5,
          memo: '정문과 매우 가까워 1교시 통학에 유리함. 남향 창문이라 채광이 뛰어나고 책상·옷장 기본 옵션 상태가 양호함.',
          checklist: {
            water: 'good',
            light: 'good',
            mold: 'good',
            noise: 'warn',
            options: 'good',
            security: 'good',
          },
          checklistNotes: {
            noise: '도로변 쪽이라 저녁 시간대 약간의 차량 소음 확인 필요',
          },
        },
        {
          id: 'prop-sample-2',
          name: '역세권 모던 오피스텔',
          roomType: '오픈형 오피스텔 · 7층',
          addressHint: '지하철역 2번 출구 도보 3분',
          deposit: 1000,
          rent: 58,
          maintenanceFee: 8,
          distanceMinutes: 9,
          areaPyeong: 7.8,
          options: [
            '에어컨',
            '세탁기',
            '냉장고',
            '인덕션/레인지',
            '책상/옷장',
            '엘리베이터',
            '전자도어락/CCTV',
          ],
          photos: ['./src/assets/images/sample_room_officetel_1795341125535.jpg'],
          color: PROPERTY_COLORS[1],
          mapX: 0.72,
          mapY: 0.33,
          rating: 4,
          memo: '신축급 빌트인 수납과 경비실·엘리베이터가 잘 갖춰져 있어 보안과 생활 편의성이 최고 수준임. 다만 관리비 포함 월 고정비가 다소 높음.',
          checklist: {
            water: 'good',
            light: 'good',
            mold: 'good',
            noise: 'good',
            options: 'good',
            security: 'good',
          },
          checklistNotes: {},
        },
        {
          id: 'prop-sample-3',
          name: '후문 조용한 1.5룸 빌라',
          roomType: '1.5룸 빌라 · 2층',
          addressHint: '후문 주거단지 내 골목',
          deposit: 400,
          rent: 42,
          maintenanceFee: 4,
          distanceMinutes: 12,
          areaPyeong: 9.2,
          options: ['에어컨', '세탁기', '냉장고', '인덕션/레인지', '발코니/베란다'],
          photos: ['./src/assets/images/sample_room_villa_1795341124880.jpg'],
          color: PROPERTY_COLORS[2],
          mapX: 0.25,
          mapY: 0.72,
          rating: 4,
          memo: '주방과 침실 공간이 분리되어 면적이 가장 넓고 월세 부담이 적음. 주택가라 밤에 조용하나 밤길 가로등 위치 한 번 더 체크 필요.',
          checklist: {
            water: 'good',
            light: 'warn',
            mold: 'good',
            noise: 'good',
            options: 'pending',
            security: 'pending',
          },
          checklistNotes: {
            light: '2층이라 오후 늦게는 주변 건물 그림자 영향이 있음',
          },
        },
      ];
    }

    /**
     * @function createDefaultVisits
     * @description 오늘 날짜를 기준으로 가까운 미래 날짜에 3건의 샘플 현장 방문 일정을 생성합니다.
     * @returns {Array<Object>} 샘플 방문 일정 배열
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    createDefaultVisits() {
      const getDate =
        root.CalendarUtils && root.CalendarUtils.getRelativeDateKey
          ? root.CalendarUtils.getRelativeDateKey
          : function (offset) {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              return d.toISOString().slice(0, 10);
            };

      return [
        {
          id: 'visit-sample-1',
          propertyId: 'prop-sample-1',
          date: getDate(1),
          time: '14:00',
          memo: '오후 채광 및 도로변 방음 재확인, 중개사님 동행',
          completed: false,
        },
        {
          id: 'visit-sample-2',
          propertyId: 'prop-sample-2',
          date: getDate(3),
          time: '16:30',
          memo: '관리비 세부 내역서 및 주차/택배함 위치 문의',
          completed: false,
        },
        {
          id: 'visit-sample-3',
          propertyId: 'prop-sample-3',
          date: getDate(5),
          time: '18:00',
          memo: '해 진 뒤 후문 골목길 가로등 밝기 및 보안 확인',
          completed: false,
        },
      ];
    }

    /**
     * @function createInitialState
     * @description 앱 전체의 기본 상태(매물, 가중치, 방문 일정, 선택 매물 ID)를 조합하여 반환합니다.
     * @returns {Object} 초기 애플리케이션 상태 객체
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    createInitialState() {
      const properties = this.createDefaultProperties();
      return {
        version: 1,
        properties,
        weights: this.createDefaultWeights(),
        visits: this.createDefaultVisits(),
        selectedPropertyId: properties[0].id,
      };
    }
  }

  root.CHECKLIST_DEFINITIONS = CHECKLIST_DEFINITIONS;
  root.PROPERTY_COLORS = PROPERTY_COLORS;
  root.SampleDataFactory = SampleDataFactory;
})(typeof globalThis !== 'undefined' ? globalThis : this);
