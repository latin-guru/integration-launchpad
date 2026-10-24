// @ts-check
/**
 * Date helpers. Dates are plain "YYYY-MM-DD" strings so they are easy to
 * store, compare and show. All math is done in UTC so a time zone or
 * daylight-saving change can never shift a due date by one day.
 */

/**
 * Adds (or subtracts, with a negative number) whole days to a date.
 * @param {string} isoDate - "YYYY-MM-DD"
 * @param {number} days
 * @returns {string} "YYYY-MM-DD"
 */
export function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/**
 * Today's date in the viewer's local calendar, as "YYYY-MM-DD".
 * @param {Date} [now]
 * @returns {string}
 */
export function todayISO(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
