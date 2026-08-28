import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function StatusDonut({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={4}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}`, 'Items']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
