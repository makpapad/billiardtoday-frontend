"use client";

import { Zap, Shield, BarChart3, Users, Globe, Clock, Award, Target } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "LIGHTNING FAST",
    description: "Real-time score updates with zero lag. Instant bracket generation.",
    gradient: "from-purple-400 to-pink-500",
    bgGradient: "from-purple-900/20 to-pink-900/20"
  },
  {
    icon: Shield,
    title: "FORTRESS SECURE",
    description: "Military-grade encryption. 99.99% uptime guarantee.",
    gradient: "from-blue-400 to-cyan-500",
    bgGradient: "from-blue-900/20 to-cyan-900/20"
  },
  {
    icon: BarChart3,
    title: "ANALYTICS PRO",
    description: "Advanced statistics. AI-powered insights. Performance tracking.",
    gradient: "from-green-400 to-emerald-500",
    bgGradient: "from-green-900/20 to-emerald-900/20"
  },
  {
    icon: Users,
    title: "PLAYER HUB",
    description: "Complete profiles. Global rankings. Tournament history.",
    gradient: "from-yellow-400 to-orange-500",
    bgGradient: "from-yellow-900/20 to-orange-900/20"
  },
  {
    icon: Globe,
    title: "GLOBAL REACH",
    description: "Multi-language support. International tournament formats.",
    gradient: "from-red-400 to-pink-500",
    bgGradient: "from-red-900/20 to-pink-900/20"
  },
  {
    icon: Clock,
    title: "24/7 READY",
    description: "Round-the-clock access. Live scoring. Instant updates.",
    gradient: "from-indigo-400 to-purple-500",
    bgGradient: "from-indigo-900/20 to-purple-900/20"
  }
];

export function DarkModernFeatures() {
  return (
    <section className="py-24 bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            UNLEASH THE
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"> POWER</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light">
            Cutting-edge features designed for champions who demand excellence.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative bg-gradient-to-br ${feature.bgGradient} rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className={`relative w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-black text-white mb-3 group-hover:text-gray-100 transition-colors tracking-wide">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                {feature.description}
              </p>

              {/* Hover Effect */}
              <div className="absolute top-0 left-0 w-full h-full rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 font-medium">AND SO MUCH MORE...</span>
          </div>
        </div>
      </div>
    </section>
  );
}
