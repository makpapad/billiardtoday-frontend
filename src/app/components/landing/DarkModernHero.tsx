"use client";

import { ArrowRight, Play, Trophy, Zap, Shield } from "lucide-react";

export function DarkModernHero() {
  return (
    <section className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-gray-300 text-sm font-medium">Next-Gen Tournament Platform</span>
        </div>

        {/* Main Title */}
        <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            BILLIARD
          </span>
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            TODAY
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
          Professional tournament management with cutting-edge technology. 
          Real-time scoring, advanced analytics, and seamless player experience.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 text-lg">
            <span className="flex items-center gap-2">
              DOMINATE
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
          </button>
          
          <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
            <span className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              WATCH DEMO
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
            <div className="text-3xl font-black text-white mb-2">1000+</div>
            <div className="text-gray-400 text-sm">TOURNAMENTS</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <Zap className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <div className="text-3xl font-black text-white mb-2">50K+</div>
            <div className="text-gray-400 text-sm">PLAYERS</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <Shield className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <div className="text-3xl font-black text-white mb-2">100%</div>
            <div className="text-gray-400 text-sm">UPTIME</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-10 border border-gray-600 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
