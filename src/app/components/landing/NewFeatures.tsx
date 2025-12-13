"use client";

import { Zap, Shield, BarChart3, Users, Globe, Clock } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Real-time score updates and instant bracket generation with zero lag.",
    gradient: "from-yellow-400 to-orange-500"
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with 99.9% uptime guarantee.",
    gradient: "from-green-400 to-emerald-500"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Detailed statistics, player performance tracking, and tournament insights.",
    gradient: "from-blue-400 to-indigo-500"
  },
  {
    icon: Users,
    title: "Player Management",
    description: "Comprehensive player profiles, rankings, and history tracking.",
    gradient: "from-purple-400 to-pink-500"
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Support for multiple languages and international tournament formats.",
    gradient: "from-cyan-400 to-blue-500"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Round-the-clock access to tournaments and live scoring.",
    gradient: "from-red-400 to-pink-500"
  }
];

export function NewFeatures() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Everything You Need for
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Professional Tournaments</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Powerful features designed for tournament organizers, players, and billiard enthusiasts.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className={`relative w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-purple-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                {feature.description}
              </p>

              {/* Hover Effect */}
              <div className="absolute top-0 left-0 w-full h-full rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full border border-purple-500/20">
            <span className="text-purple-300 font-medium">And much more...</span>
          </div>
        </div>
      </div>
    </section>
  );
}
