"use client";

import { PlayCircle, Users, Trophy, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: PlayCircle,
    title: "Create Tournament",
    description: "Set up your tournament with custom rules, player registration, and bracket configuration.",
    color: "text-blue-500",
    bgGradient: "from-blue-50 to-indigo-50"
  },
  {
    icon: Users,
    title: "Register Players",
    description: "Invite players to register, manage teams, and organize participants efficiently.",
    color: "text-green-500",
    bgGradient: "from-green-50 to-emerald-50"
  },
  {
    icon: Trophy,
    title: "Live Scoring",
    description: "Track matches in real-time, update scores instantly, and monitor progress.",
    color: "text-yellow-500",
    bgGradient: "from-yellow-50 to-orange-50"
  },
  {
    icon: BarChart3,
    title: "Analyze Results",
    description: "View comprehensive statistics, player performance, and tournament analytics.",
    color: "text-purple-500",
    bgGradient: "from-purple-50 to-pink-50"
  }
];

export function OriginalLightHowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get your tournament up and running in minutes with our simple 4-step process
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>

              {/* Step Card */}
              <div className={`bg-gradient-to-br ${step.bgGradient} rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg h-full`}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm">
                    <step.icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400" />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300">
            Start Your First Tournament
          </button>
        </div>
      </div>
    </section>
  );
}
