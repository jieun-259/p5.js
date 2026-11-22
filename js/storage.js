/**
 * @fileoverview LocalStorage 자동 저장/복원 및 업로드 이미지 압축 관리 모듈
 * @ai-assisted 본 파일의 클래스 및 함수는 AI(생성형 AI 어시스턴트)의 도움을 받아 작성되었으며,
 * 브라우저 용량 제한을 고려한 이미지 리사이즈 압축 로직이 포함되어 있습니다.
 */

(function (root) {
  'use strict';

  const STORAGE_KEY = 'jajwi_room_helper_state_v1';

  /**
   * @class StorageManager
   * @description 애플리케이션의 매물, 가중치, 체크리스트, 메모, 별점, 방문 일정을
   * 브라우저 LocalStorage에 자동 저장하고 복원하며, 업로드 사진 압축을 처리하는 클래스입니다.
   * @ai-assisted AI의 도움을 받아 LocalStorage 직렬화 및 Canvas 압축 로직으로 작성되었습니다.
   */
  class StorageManager {
    /**
     * @function constructor
     * @description 저장소 키를 초기화합니다.
     * @param {string} [storageKey] - 사용할 LocalStorage 키 이름
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    constructor(storageKey) {
      this.storageKey = storageKey || STORAGE_KEY;
    }

    /**
     * @function loadState
     * @description LocalStorage에서 저장된 상태를 읽어 파싱합니다.
     * 저장된 데이터가 없거나 손상된 경우 null을 반환합니다.
     * @returns {Object|null} 복원된 상태 객체 또는 null
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    loadState() {
      try {
        const raw = window.localStorage.getItem(this.storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.properties)) return null;
        return parsed;
      } catch (err) {
        console.warn('저장된 상태를 불러오는 중 오류가 발생했습니다:', err);
        return null;
      }
    }

    /**
     * @function saveState
     * @description 현재 애플리케이션 상태를 JSON 문자열로 변환하여 LocalStorage에 저장합니다.
     * 용량 초과(QuotaExceededError) 시 사진 데이터를 제외한 백업 안내용 플래그를 반환합니다.
     * @param {Object} state - 저장할 전체 상태 객체
     * @returns {boolean} 저장 성공 여부
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    saveState(state) {
      try {
        const payload = {
          version: 1,
          updatedAt: new Date().toISOString(),
          properties: state.properties,
          weights: state.weights,
          visits: state.visits,
          selectedPropertyId: state.selectedPropertyId,
        };
        window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
        return true;
      } catch (err) {
        console.error('LocalStorage 저장 실패:', err);
        return false;
      }
    }

    /**
     * @function clearState
     * @description LocalStorage에 저장된 프로젝트 데이터를 삭제합니다.
     * @ai-assisted AI의 도움을 받아 작성되었습니다.
     */
    clearState() {
      try {
        window.localStorage.removeItem(this.storageKey);
      } catch (err) {
        console.warn('LocalStorage 초기화 중 오류:', err);
      }
    }

    /**
     * @function compressImageFile
     * @description 사용자가 업로드한 현장 사진(File)을 HTML5 Canvas로 최대 너비 640px,
     * JPEG 품질 0.72로 리사이즈·압축하여 Base64 Data URL로 반환합니다.
     * @param {File} file - 업로드된 이미지 파일 객체
     * @param {number} [maxWidth=640] - 최대 가로 해상도
     * @param {number} [quality=0.72] - JPEG 압축 품질 (0~1)
     * @returns {Promise<string>} 압축된 Base64 이미지 문자열
     * @ai-assisted AI의 도움을 받아 비동기 FileReader + Canvas 압축 로직으로 작성되었습니다.
     */
    compressImageFile(file, maxWidth = 640, quality = 0.72) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
          reject(new Error('이미지 파일만 업로드할 수 있습니다.'));
          return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('이미지 파일을 읽는 데 실패했습니다.'));
        reader.onload = (event) => {
          const img = new Image();
          img.onerror = () => reject(new Error('이미지를 디코딩할 수 없습니다.'));
          img.onload = () => {
            const scale = img.width > maxWidth ? maxWidth / img.width : 1;
            const targetWidth = Math.max(1, Math.round(img.width * scale));
            const targetHeight = Math.max(1, Math.round(img.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('캔버스 컨텍스트를 생성할 수 없습니다.'));
              return;
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
  }

  root.StorageManager = StorageManager;
})(typeof globalThis !== 'undefined' ? globalThis : this);
