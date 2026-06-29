type UnknownObject = Record<string, unknown>;

/**
 * 객체의 키를 카멜 케이스로 변환합니다.
 * @param obj - 변환할 객체
 * @returns 키가 카멜 케이스로 변환된 객체
 */
export const toCamelCase = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v));
  } else if (
    obj !== undefined &&
    obj !== null &&
    (obj as UnknownObject).constructor === Object
  ) {
    return Object.keys(obj as UnknownObject).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase((obj as UnknownObject)[key]);
      return result;
    }, {} as UnknownObject);
  }
  return obj;
};

/**
 * 객체의 키를 스네이크 케이스로 변환합니다.
 * @param obj - 변환할 객체
 * @returns 키가 스네이크 케이스로 변환된 객체
 */
export const toSnakeCase = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map((v) => toSnakeCase(v));
  } else if (
    obj !== undefined &&
    obj !== null &&
    (obj as UnknownObject).constructor === Object
  ) {
    return Object.keys(obj as UnknownObject).reduce((result, key) => {
      const snakeKey = key.replace(
        /[A-Z]/g,
        (letter) => `_${letter.toLowerCase()}`,
      );
      result[snakeKey] = toSnakeCase((obj as UnknownObject)[key]);
      return result;
    }, {} as UnknownObject);
  }
  return obj;
};
