import { TrendingUp, Zap, Globe, DollarSign } from "lucide-react";

const STATS = [
  {
    icon: <TrendingUp className="size-6 text-blue-400" />,
    value: "20%",
    label: "Efficiency Gains",
  },
  {
    icon: <Zap className="size-6 text-blue-400" />,
    value: "10 min",
    label: "Avg Setup Time",
  },
  {
    icon: <Globe className="size-6 text-blue-400" />,
    value: "3",
    label: "Continents Served",
  },
  {
    icon: <DollarSign className="size-6 text-blue-400" />,
    value: "68%",
    label: "Cost Saving",
  },
];

export function StatsSection() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center text-center"
          >
            <p className="text-4xl font-bold text-blue-400">{stat.value}</p>
            <p className="mt-1 text-sm font-medium text-white/60">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
