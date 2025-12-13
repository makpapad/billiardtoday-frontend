"use client";

import { Zap, Shield, BarChart3, Users, Globe, Clock, Trophy, Star } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "SUPER FAST! ⚡",
    description: "Lightning quick scores! No waiting! Instant results!",
    gradient: "from-yellow-400 to-orange-500",
    bgGradient: "from-yellow-100 to-orange-100"
  },
  {
    icon: Shield,
    title: "SUPER SAFE! 🛡️",
    description: "Your data is secure! Protected by magic shields!",
    gradient: "from-green-400 to-emerald-500",
    bgGradient: "from-green-100 to-emerald-100"
  },
  {
    icon: BarChart3,
    title: "SUPER STATS! 📊",
    description: "Awesome charts! Track your progress! Become a pro!",
    gradient: "from-blue-400 to-indigo-500",
    bgGradient: "from-blue-100 to-indigo-100"
  },
  {
    icon: Users,
    title: "SUPER FRIENDS! 👥",
    description: "Meet players! Make friends! Challenge everyone!",
    gradient: "from-purple-400 to-pink-500",
    bgGradient: "from-purple-100 to-pink-100"
  },
  {
    icon: Globe,
    title: "SUPER GLOBAL! 🌍",
    description: "Play worldwide! Join tournaments! Be famous!",
    gradient: "from-cyan-400 to-blue-500",
    bgGradient: "from-cyan-100 to-blue-100"
  },
  {
    icon: Clock,
    title: "SUPER 24/7! 🕐",
    description: "Always open! Never sleep! Play anytime!",
    gradient: "from-red-400 to-pink-500",
    bgGradient: "from-red-100 to-pink-100"
  }
];

export function SportFunFeatures() {
  return (
    <section className="py-20 bg-gradient-to-b from-yellow-100 via-orange-100 to-pink-100">
      <div className="max-w-7xl mx-auto px-6">
        {/* Fun Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black text-gray-900 mb-6">
            SUPER FEATURES! 🎉
            <span className="block text-3xl mt-2 text-orange-600">
              Everything You Need for FUN! 🎮
            </span>
          </h2>
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto font-bold">
            Amazing features that make tournaments EXTRA FUN! 🌟
          </p>
        </div>

        {/* Fun Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group relative bg-gradient-to-br ${feature.bgGradient} rounded-3xl p-8 border-4 border-gray-300 hover:border-gray-400 transition-all duration-300 hover:shadow-2xl hover:scale-105 transform`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Fun Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-20 group-hover:opacity-30 rounded-3xl transition-opacity duration-300`} />
              
              {/* Fun Icon */}
              <div className={`relative w-20 h-20 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg border-4 border-white`}>
                <feature.icon className="w-10 h-10 text-white" />
              </div>

              {/* Fun Content */}
              <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-700 text-lg leading-relaxed group-hover:text-gray-600 transition-colors font-bold">
                {feature.description}
              </p>

              {/* Fun Hover Effect */}
              <div className="absolute top-0 left-0 w-full h-full rounded-3xl bg-gradient-to-r from-yellow-300/20 to-pink-300/20 opacity-0 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Fun Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full border-4 border-orange-500 animate-bounce">
            <Trophy className="w-6 h-6 text-orange-600" />
            <span className="text-orange-800 font-black text-xl">AND SO MUCH MORE FUN! 🎊</span>
            <Star className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </div>
    </section>
  );
}
