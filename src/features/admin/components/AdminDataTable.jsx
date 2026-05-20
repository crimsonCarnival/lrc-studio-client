import useInputMethod from '@/shared/hooks/useInputMethod';

/**
 * Responsive admin data table component
 * Displays data as a card-based layout on mobile (touch devices)
 * and as a traditional table on desktop
 *
 * @param {Array} columns - Array of column definitions: { key: string, label: string }
 * @param {Array} data - Array of row data objects
 * @param {Function} renderCell - Optional function to render cell content (row, colKey) => JSX
 * @param {Function} renderRow - Optional function to render entire row with custom layout
 * @param {Function} onRowAction - Optional callback when row action button is clicked
 * @param {string} actionLabel - Label for the row action button (default: "View Details")
 */
export function AdminDataTable({
  columns,
  data,
  renderCell,
  renderRow,
  onRowAction,
  actionLabel = 'View Details'
}) {
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';

  if (isMobile) {
    // Card-based layout for mobile
    return (
      <div className="flex flex-col gap-3 p-4">
        {data && data.length > 0 ? (
          data.map((row, idx) =>
            renderRow ? (
              renderRow(row, idx, isMobile)
            ) : (
              <div key={idx} className="bg-zinc-800/30 rounded-lg p-4 flex flex-col gap-3 border border-zinc-700/50">
                {columns.map((col) => (
                  <div key={col.key} className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold text-zinc-400 flex-shrink-0">
                      {col.label}
                    </span>
                    <span className="text-sm text-zinc-100 text-right flex-1">
                      {renderCell ? renderCell(row, col.key) : row[col.key]}
                    </span>
                  </div>
                ))}
                {onRowAction && (
                  <button
                    onClick={() => onRowAction(row)}
                    className="mt-2 h-11 px-3 text-sm font-medium bg-primary/20 hover:bg-primary/30 rounded-lg text-primary transition-colors active:bg-primary/40"
                  >
                    {actionLabel}
                  </button>
                )}
              </div>
            )
          )
        ) : (
          <div className="text-center p-8 text-zinc-500">No data available</div>
        )}
      </div>
    );
  }

  // Desktop table layout
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800">
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-3 text-left font-semibold text-zinc-400 text-xs uppercase tracking-wider">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/30">
        {data && data.length > 0 ? (
          data.map((row, idx) =>
            renderRow ? (
              renderRow(row, idx, isMobile)
            ) : (
              <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-zinc-200">
                    {renderCell ? renderCell(row, col.key) : row[col.key]}
                  </td>
                ))}
              </tr>
            )
          )
        ) : (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
              No data available
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default AdminDataTable;
