/**
 * 주어진 값을 항상 배열 형태로 변환하여 반환합니다.
 * 값이 undefined나 null일 경우 빈 배열을 반환합니다.
 * 값이 이미 배열일 경우 그대로 반환합니다.
 * 값이 단일 객체나 기타 값일 경우 배열로 감싸서 반환합니다.
 *
 * @param value - 변환할 값
 * @returns 배열
 */
export const ensureArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};
