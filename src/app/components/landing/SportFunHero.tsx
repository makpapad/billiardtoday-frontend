"use client";

import { ArrowRight, Play, Trophy, Zap, Star, Gamepad2 } from "lucide-react";

export function SportFunHero() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center overflow-hidden">
      {/* Fun Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-400 via-red-500 to-pink-500" />
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-300 rounded-full animate-bounce" />
        <div className="absolute top-20 right-20 w-24 h-24 bg-green-300 rounded-full animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-28 h-28 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-10 right-1/3 w-36 h-36 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: "2s" }} />
        
        {/* Fun Patterns */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 text-6xl">🎱</div>
          <div className="absolute top-20 right-20 text-4xl">🏆</div>
          <div className="absolute bottom-20 left-1/4 text-5xl">🎯</div>
          <div className="absolute bottom-10 right-1/3 text-3xl">⭐</div>
          <div className="absolute top-1/2 left-1/3 text-4xl">🎮</div>
          <div className="absolute top-1/3 right-1/4 text-5xl">🎪</div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Fun Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 mb-8">
          <Gamepad2 className="w-5 h-5 text-white" />
          <span className="text-white text-lg font-bold animate-pulse">GAME ON! 🎉</span>
        </div>

        {/* Fun Title */}
        <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight text-white">
          LET'S PLAY
          <br />
          <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
            BILLIARDS!
          </span>
        </h1>

        {/* Fun Subtitle */}
        <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed font-bold">
          The most fun way to organize tournaments! 🎱 
          Challenge friends, track scores, and become a champion! 🏆
        </p>

        {/* Fun CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
          <button className="group relative px-10 py-6 bg-yellow-400 text-gray-900 font-black rounded-2xl hover:bg-yellow-300 transition-all duration-300 hover:shadow-2xl hover:scale-110 text-xl animate-bounce">
            <span className="flex items-center gap-3">
              START PLAYING! 🎮
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </span>
          </button>
          
          <button className="px-10 py-6 bg-white/20 backdrop-blur-sm text-white font-bold rounded-2xl border-4 border-white/30 hover:bg-white/30 transition-all duration-300 text-xl">
            <span className="flex items-center gap-3">
              <Play className="w-6 h-6" />
              WATCH FUN! 🎬
            </span>
          </button>
        </div>

        {/* Fun Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 border-4 border-white/30 transform hover:scale-110 transition-transform">
            <Trophy className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
            <div className="text-4xl font-black text-white mb-2">1000+</div>
            <div className="text-white text-lg font-bold">FUN TOURNAMENTS! 🎉</div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 border-4 border-white/30 transform hover:scale-110 transition-transform">
            <Zap className="w-12 h-12 text-cyan-300 mx-auto mb-4" />
            <div className="text-4xl font-black text-white mb-2">50K+</div>
            <div className="text-white text-lg font-bold">HAPPY PLAYERS! 😄</div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 border-4 border-white/30 transform hover:scale-110 transition-transform">
            <Star className="w-12 h-12 text-pink-300 mx-auto mb-4" />
            <div className="text-4xl font-black text-white mb-2">5⭐</div>
            <div className="text-white text-lg font-bold">FUN RATING! 🌟</div>
          </div>
        </div>
      </div>

      {/* Fun Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-8 h-12 border-4 border-white/50 rounded-full flex justify-center animate-bounce">
          <div className="w-2 h-4 bg-white rounded-full mt-2" />
        </div>
        <div className="text-white text-center mt-2 font-bold animate-pulse">SCROLL! 👇</div>
      </div>
    </section>
  );
}
