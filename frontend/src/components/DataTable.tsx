import React, { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  SortingState,
  Row,
  OnChangeFn,
} from '@tanstack/react-table';

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: Row<T>) => void;
  rowClassName?: (row: Row<T>) => string;
  mobileCardRender?: (item: T) => React.ReactNode;
  enableMobileCards?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  sorting = [],
  onSortingChange,
  manualSorting = false,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowClassName,
  mobileCardRender,
  enableMobileCards = true,
}: DataTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    manualSorting,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Mobile card view
  if (isMobile && enableMobileCards && mobileCardRender) {
    return (
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{emptyMessage}</div>
        ) : (
          data.map((item, index) => (
            <div
              key={index}
              onClick={() => onRowClick?.(table.getRowModel().rows[index])}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${
                onRowClick ? 'cursor-pointer hover:shadow-md' : ''
              } transition-shadow ${rowClassName ? rowClassName(table.getRowModel().rows[index]) : ''}`}
            >
              {mobileCardRender(item)}
            </div>
          ))
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={
                        header.column.getCanSort()
                          ? 'flex items-center cursor-pointer select-none hover:text-gray-700'
                          : ''
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span className="ml-2">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted() as string] ?? '↕'}
                        </span>
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-8 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-gray-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName ? rowClassName(row) : ''}`}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
