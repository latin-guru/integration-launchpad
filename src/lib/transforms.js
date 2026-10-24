// @ts-check
/**
 * Transforms turn a value from the customer's system into the shape the
 * Bayline Loop Conversion API expects. Each one is a small function that takes
 * the source value and returns the converted value, or undefined when the
 * value cannot be converted (validation then reports the problem).
 */

/** @typedef {(value: unknown, constantValue?: string) => unknown} Transform */

/** @type {Record<string, Transform>} */
export const transforms = {
  /** Pass the value through unchanged. */
  none: (value) => value,

  /** Turn a number such as 7301 into the text "7301". */
  toString: (value) => (value === undefined || value === null ? undefined : String(value)),

  /**
   * Turn a money amount like "84.50" into integer cents (8450).
   * Math.round fixes tiny float errors such as 19.99 * 100 = 1998.9999.
   */
  toCents: (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
  },

  /** Upper-case text, for example "usd" to "USD". */
  upper: (value) => (typeof value === 'string' ? value.toUpperCase() : undefined),

  /** Normalize any date the browser can read to an ISO-8601 UTC timestamp. */
  isoDate: (value) => {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  },

  /** A shopper's order count becomes "new" (first order) or "returning". */
  customerStatus: (value) => {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 1) return undefined;
    return count === 1 ? 'new' : 'returning';
  },

  /** The store's webhook topic becomes a Bayline Loop event type. */
  eventType: (value) => {
    if (value === 'orders/paid') return 'sale';
    if (value === 'refunds/create') return 'reversal';
    return undefined;
  },

  /** Ignore the source and always send the same configured value. */
  constant: (_value, constantValue) => constantValue,
};

/** Transform names in the order the Mapping screen lists them. */
export const transformNames = Object.keys(transforms);
