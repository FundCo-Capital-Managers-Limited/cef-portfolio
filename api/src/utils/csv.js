// Minimal CSV serializer — quotes any field containing a comma, quote, or
// newline, and doubles embedded quotes (RFC 4180). No library needed for
// this small a job.
function toCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => toCsvField(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => toCsvField(c.value(row))).join(','));
  return [header, ...lines].join('\n');
}

module.exports = { toCsv };
