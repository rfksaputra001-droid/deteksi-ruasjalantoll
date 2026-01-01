import PropTypes from 'prop-types'

export default function Table({ columns, data, striped = true }) {
  return (
    <div className="w-full overflow-hidden rounded-lg shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                  striped && rowIndex % 2 === 0 ? 'bg-white' : striped ? 'bg-gray-50' : ''
                }`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      render: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  striped: PropTypes.bool,
}
