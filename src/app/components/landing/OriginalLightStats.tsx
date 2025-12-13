"use client";

import { Trophy, Users, Target, TrendingUp } from "lucide-react";

const stats = [
  {
    icon: Trophy,
    value: "500+",
    label: "Active Tournaments",
    color: "text-yellow-500",
    bgGradient: "from-yellow-50 to-orange-50"
  },
  {
    icon: Users,
    value: "10,000+",
    label: "Registered Players",
    color: "text-blue-500",
    bgGradient: "from-blue-50 to-indigo-50"
  },
  {
    icon: Target,
    value: "50,000+",
    label: "Matches Played",
    color: "text-green-500",
    bgGradient: "from-green-50 to-emerald-50"
  },
  {
    icon: TrendingUp,
    value: "99.9%",
    label: "Uptime",
    color: "text-purple-500",
    bgGradient: "from-purple-50 to-pink-50"
  }
];

export function OriginalLightStats() {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Trusted by Billiard Enthusiasts Worldwide
          </h2>
          <p className="text-lg text-gray-600">
            Join thousands of players and organizers using our platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`bg-gradient-to-br ${stat.bgGradient} rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg`}
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
