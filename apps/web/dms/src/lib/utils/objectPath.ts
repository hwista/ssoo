type ObjectLike = Record<string, unknown>;

export function getNestedValue(obj: ObjectLike, pathText: string): unknown {
  if (!pathText) return obj;
  return pathText.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
      return (acc as ObjectLike)[key];
    }
    return undefined;
  }, obj);
}

export function setNestedValue<T extends ObjectLike>(obj: T, pathText: string, value: unknown): T {
  if (!pathText) {
    return value as T;
  }

  const keys = pathText.split('.');
  const result: ObjectLike = { ...obj };
  let cursor: ObjectLike = result;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const nextValue = cursor[key];
    cursor[key] = nextValue && typeof nextValue === 'object' && !Array.isArray(nextValue)
      ? { ...(nextValue as ObjectLike) }
      : {};
    cursor = cursor[key] as ObjectLike;
  }

  cursor[keys[keys.length - 1]] = value;
  return result as T;
}
