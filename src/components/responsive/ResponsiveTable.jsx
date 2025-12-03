import "../../styles/tables.css"

export default function ResponsiveTable({ headers = [], rows = [], cols = [], renderCell = null, className = "" }) {
  return (
    <div className="table-wrapper table-scroll-container">
      <table className={className}>
        <thead>
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} className="table-cell-center">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {cols.map((col, colIdx) => (
                <td key={`${rowIdx}-${colIdx}`} className={col.className || ""} data-label={headers[colIdx]}>
                  {renderCell ? renderCell(row, col, rowIdx, colIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
