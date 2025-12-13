"use client";

import { Zap, Shield, BarChart3, Users, Globe, Clock, Star, Target, Award } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Real-time score updates and instant bracket generation with zero lag.",
    gradient: "from-yellow-400 to-orange-500",
    bgGradient: "from-yellow-50 to-orange-50"
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security with 99.9% uptime guarantee.",
    gradient: "from-green-400 to-emerald-500",
    bgGradient: "from-green-50 to-emerald-50"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Detailed statistics, player performance tracking, and tournament insights.",
    gradient: "from-blue-400 to-indigo-500",
    bgGradient: "from-blue-50 to-indigo-50"
  },
  {
    icon: Users,
    title: "Player Management",
    description: "Comprehensive player profiles, rankings, and history tracking.",
    gradient: "from-purple-400 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50"
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Support for multiple languages and international tournament formats.",
    gradient: "from-cyan-400 to-blue-500",
    bgGradient: "from-cyan-50 to-blue-50"
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Round-the-clock access to tournaments and live scoring.",
    gradient: "from-red-400 to-pink-500",
    bgGradient: "from-red-50 to-pink-50"
  }
];

export function LightFeatures() {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Everything You Need for
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Professional Tournaments</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed for tournament organizers, players, and billiard enthusiasts.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative bg-gradient-to-br ${feature.bgGradient} rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-200/50`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className={`relative w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                {feature.description}
              </p>

              {/* Hover Effect */}
              <div className="absolute top-0 left-0 w-full h-full rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200">
            <Star className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700 font-medium">And much more...</span>
          </div>
        </div>
      </div>
    </section>
  );
}
