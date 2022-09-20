import React from "react"

import {
  // ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  // SortingState,
  useReactTable,
} from '@tanstack/react-table'

function Component(props) {
  const { data, columns } = props;

  const [sorting, setSorting] = React.useState([{
    id: 'status',
    desc: true,
  }]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <div className="py-0 inline-block min-w-full">
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead className="border-b">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="bg-gray-100">
                    {headerGroup.headers.map(header => {
                      return (
                        <th key={header.id} colSpan={header.colSpan} className="text-sm font-medium text-gray-900 px-1 py-4 text-center">
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                                  onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted()] ?? null}
                            </div>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => {
                  return (
                    <tr key={row.id} className="border-b hover:bg-gray-100">
                      {row.getVisibleCells().map(cell => {
                        return (
                          <td key={cell.id} className="text-sm text-gray-900 font-light px-1 py-2 whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
