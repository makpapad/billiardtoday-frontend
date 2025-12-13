"use client";

import { Club, Users, Trophy, Star } from "lucide-react";

const audiences = [
  {
    icon: Club,
    title: "Billiard Clubs",
    description: "Organize club tournaments, manage members, and track player progress over time.",
    features: ["Member Management", "Club Rankings", "Monthly Tournaments"],
    color: "text-blue-500",
    bgGradient: "from-blue-50 to-indigo-50"
  },
  {
    icon: Users,
    title: "Tournament Organizers",
    description: "Host professional events with comprehensive bracket management and live scoring.",
    features: ["Professional Brackets", "Live Scoring", "Registration System"],
    color: "text-green-500",
    bgGradient: "from-green-50 to-emerald-50"
  },
  {
    icon: Trophy,
    title: "Players",
    description: "Track your performance, join tournaments, and improve your game with detailed analytics.",
    features: ["Performance Stats", "Tournament History", "Rankings"],
    color: "text-yellow-500",
    bgGradient: "from-yellow-50 to-orange-50"
  },
  {
    icon: Star,
    title: "Fans & Spectators",
    description: "Follow live tournaments, check player stats, and stay updated with the billiard community.",
    features: ["Live Updates", "Player Profiles", "Tournament Calendar"],
    color: "text-purple-500",
    bgGradient: "from-purple-50 to-pink-50"
  }
];

export function OriginalLightAudience() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Built for Everyone in the Billiard Community
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Whether you're a club owner, tournament organizer, player, or fan, we have tools designed for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {audiences.map((audience, index) => (
            <div
              key={audience.title}
              className={`bg-gradient-to-br ${audience.bgGradient} rounded-2xl p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg`}
            >
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <audience.icon className={`w-8 h-8 ${audience.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    {audience.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {audience.description}
                  </p>
                  <ul className="space-y-2">
                    {audience.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-gray-700">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
