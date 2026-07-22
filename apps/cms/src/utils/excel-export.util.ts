/**
 * Utility to export tabular data to Excel (.csv format with UTF-8 BOM for Excel compatibility)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columnMap: { key: keyof T | string; label: string; formatter?: (val: any, row: T) => any }[],
) {
  if (!data || data.length === 0) {
    alert('Không có dữ liệu để xuất Excel.');
    return;
  }

  // Header row
  const headers = columnMap.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  // Data rows
  const rows = data.map((row) => {
    return columnMap
      .map((col) => {
        let val = (row as any)[col.key];
        if (col.formatter) {
          val = col.formatter(val, row);
        }
        if (val === null || val === undefined) val = '';
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(',');
  });

  // UTF-8 BOM prefix \uFEFF ensures Excel displays Vietnamese characters properly
  const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
