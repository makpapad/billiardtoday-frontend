"use client";

import { ArrowRight } from "lucide-react";

export function MinimalHero() {
  return (
    <section className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Simple Badge */}
        <div className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full mb-8">
          Professional Tournament Management
        </div>

        {/* Clean Title */}
        <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-6 leading-tight">
          Billiard
          <span className="font-normal">Today</span>
        </h1>

        {/* Simple Description */}
        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Simple, elegant tournament management for billiard clubs and organizers.
          Live scoring, brackets, and analytics.
        </p>

        {/* Clean CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-8 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
            Get Started
            <ArrowRight className="inline-block w-4 h-4 ml-2" />
          </button>
          <button className="px-8 py-3 text-gray-700 font-medium rounded-lg border border-gray-300 hover:border-gray-400 transition-colors">
            Learn More
          </button>
        </div>

        {/* Simple Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-20">
          <div>
            <div className="text-2xl font-light text-gray-900">500+</div>
            <div className="text-sm text-gray-600">Tournaments</div>
          </div>
          <div>
            <div className="text-2xl font-light text-gray-900">10K+</div>
            <div className="text-sm text-gray-600">Players</div>
          </div>
          <div>
            <div className="text-2xl font-light text-gray-900">50K+</div>
            <div className="text-sm text-gray-600">Matches</div>
          </div>
        </div>
      </div>
    </section>
  );
}
