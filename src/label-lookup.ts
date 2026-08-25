export function lookupStringCodeLabel<const T extends Record<string, string>>(
  labels: T,
  code: string | number | null | undefined,
): T[keyof T] | undefined {
  if (code === null || code === undefined) {
    return undefined
  }

  const tag = Object.prototype.toString.call(code)
  if (tag === '[object String]') {
    const trimmed = String(code).trim()
    if (!Object.hasOwn(labels, trimmed)) {
      return undefined
    }
    // SAFETY: Object.hasOwn confirmed trimmed is an own key of labels.
    return labels[trimmed as keyof T & string]
  }

  return undefined
}

export function lookupNumericIdLabel<const T extends Record<string, string>>(
  labels: T,
  id: string | number | null | undefined,
): T[keyof T] | undefined {
  if (id === null || id === undefined) {
    return undefined
  }

  const tag = Object.prototype.toString.call(id)
  if (tag === '[object Number]') {
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) {
      return undefined
    }
    return lookupOwnLabel(labels, String(numericId))
  }

  if (tag === '[object String]') {
    return lookupOwnLabel(labels, String(id).trim())
  }

  return undefined
}

function lookupOwnLabel<const T extends Record<string, string>>(
  labels: T,
  key: string,
): T[keyof T] | undefined {
  if (!Object.hasOwn(labels, key)) {
    return undefined
  }
  // SAFETY: Object.hasOwn confirmed key is an own key of labels.
  return labels[key as keyof T & string]
}
