import { TrendingUp, Zap, Globe, DollarSign } from "lucide-react";

const STATS = [
  {
    icon: <TrendingUp className="size-6 text-blue-400" />,
    value: "300%",
    label: "Efficiency Boost",
  },
  {
    icon: <Zap className="size-6 text-blue-400" />,
    value: "< 10min",
    label: "Deployment Time",
  },
  {
    icon: <Globe className="size-6 text-blue-400" />,
    value: "100+",
    label: "Integrations",
  },
  {
    icon: <DollarSign className="size-6 text-blue-400" />,
    value: "60%",
    label: "Cost Reduction",
  },
];

export function StatsSection() {
  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
