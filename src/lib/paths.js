// @ts-check
/**
 * Reading values out of the customer's JSON with simple dot paths,
 * for example "order.discount_codes.0.code".
 */

/**
 * Returns the value at a dot path, or undefined if any step is missing.
 * Array items are reached with their index ("line_items.0.title").
 * @param {unknown} source
 * @param {string} path
 * @returns {unknown}
 */
export function getByPath(source, path) {
  if (!path) return undefined;
  let current = source;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = /** @type {Record<string, unknown>} */ (current)[key];
  }
  return current;
}

/**
 * Lists every leaf path in an object (the values a field can be mapped from).
 * Used to fill the "source path" dropdown on the Mapping screen.
 * @param {unknown} source
 * @param {string} [prefix]
 * @returns {string[]}
 */
export function listPaths(source, prefix = '') {
  if (source === null || typeof source !== 'object') {
    return prefix ? [prefix] : [];
  }
  const paths = [];
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    paths.push(...listPaths(value, path));
  }
  return paths;
}
