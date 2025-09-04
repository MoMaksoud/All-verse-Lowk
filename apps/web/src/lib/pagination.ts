export function parsePagination(input: URLSearchParams, defaults = { page: 1, limit: 20 }) {
  let page = Number(input.get("page") ?? defaults.page);
  let limit = Number(input.get("limit") ?? defaults.limit);
  if (!Number.isFinite(page) || page < 1) page = defaults.page;
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) limit = defaults.limit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
