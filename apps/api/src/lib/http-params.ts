/**
 * Express 5 types a route parameter as `string | string[]`. We never allow
 * repeated parameters, so anything that is not a single string is empty and
 * will fail the usual validation.
 */
export function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}
