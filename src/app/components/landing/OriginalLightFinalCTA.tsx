"use client";

import { ArrowRight, Play, Star } from "lucide-react";

export function OriginalLightFinalCTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-white/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-8">
          <Star className="w-4 h-4 text-yellow-300" />
          <span className="text-white text-sm font-medium">Join Thousands of Players</span>
        </div>

        {/* Main Title */}
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Ready to Transform Your
          <br />
          <span className="text-yellow-300">Billiard Tournaments?</span>
        </h2>

        {/* Subtitle */}
        <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
          Join the community of professional organizers and players who trust BilliardToday 
          for their tournament management needs.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button className="group relative px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 hover:scale-105">
            <span className="flex items-center gap-2">
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
          </button>
          
          <button className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300">
            <span className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Watch Demo
            </span>
          </button>
        </div>

        {/* Social Proof */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 bg-white/20 rounded-full border-2 border-white/30 flex items-center justify-center text-xs">
                  {i}
                </div>
              ))}
            </div>
            <span>500+ Active Clubs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 text-yellow-300 fill-current" />
              ))}
            </div>
            <span>4.9/5 Rating</span>
          </div>
        </div>
      </div>
    </section>
  );
}
