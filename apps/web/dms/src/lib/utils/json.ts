type ObjectLike = Record<string, unknown>;

export function isPlainObject(value: unknown): value is ObjectLike {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

export function parseJsonObject(text: string):
  | { success: true; data: ObjectLike }
  | { success: false; error: string } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isPlainObject(parsed)) {
      return { success: false, error: 'JSON 최상위 값은 객체여야 합니다.' };
    }
    return { success: true, data: parsed };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSON 파싱에 실패했습니다.',
    };
  }
}

export function deepMergeRecords<T extends ObjectLike>(target: T, source: ObjectLike): T {
  const result: ObjectLike = { ...target };

  Object.entries(source).forEach(([key, sourceValue]) => {
    const targetValue = result[key];
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key] = deepMergeRecords(targetValue, sourceValue);
      return;
    }
    result[key] = sourceValue;
  });

  return result as T;
}
