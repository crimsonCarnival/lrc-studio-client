import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import useInputMethod from '@/shared/hooks/useInputMethod';

interface Column {
  key: string;
  label: string;
}

type Row = Record<string, unknown> & { _id?: string; id?: string };

interface AdminDataTableProps {
  columns: Column[];
  data?: Row[];
  renderCell?: (row: Row, colKey: string) => ReactNode;
  renderRow?: (row: Row, idx: number, isMobile: boolean) => ReactNode;
  onRowAction?: (row: Row) => void;
  actionLabel?: string;
}

/**
 * Responsive admin data table component.
 * Card-based layout on mobile (touch devices), traditional table on desktop.
 */
export function AdminDataTable({
  columns,
  data,
  renderCell,
  renderRow,
  onRowAction,
  actionLabel
}: AdminDataTableProps) {
  const { t } = useTranslation();
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';
  const rowActionLabel = actionLabel || t('admin.table.viewDetails');

  if (isMobile) {
    // Card-based layout for mobile
    return (
      <div className="flex flex-col gap-3 p-4">
        {data && data.length > 0 ? (
          data.map((row, idx) =>
            renderRow ? (
              renderRow(row, idx, isMobile)
            ) : (
              <div key={row._id || row.id || `row-${idx}`} className="bg-zinc-800/30 rounded-lg p-4 flex flex-col gap-3 border border-zinc-700/50">
                {columns.map((col) => (
                  <div key={col.key} className="flex justify-between items-start gap-2">
                    <span className="text-xs font-semibold text-zinc-400 flex-shrink-0">
                      {col.label}
                    </span>
                    <span className="text-sm text-zinc-100 text-right flex-1">
                      {renderCell ? renderCell(row, col.key) : (row[col.key] as ReactNode)}
                    </span>
                  </div>
                ))}
                {onRowAction && (
                  <button
                    onClick={() => onRowAction(row)}
                    className="mt-2 h-11 px-3 text-sm font-medium bg-primary/20 hover:bg-primary/30 rounded-lg text-primary transition-colors active:bg-primary/40"
                  >
                    {rowActionLabel}
                  </button>
                )}
              </div>
            )
          )
        ) : (
          <div className="text-center p-8 text-zinc-500">{t('admin.table.noData')}</div>
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
              <tr key={row._id || row.id || `row-${idx}`} className="hover:bg-zinc-800/20 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-zinc-200">
                    {renderCell ? renderCell(row, col.key) : (row[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            )
          )
        ) : (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
              {t('admin.table.noData')}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default AdminDataTable;
