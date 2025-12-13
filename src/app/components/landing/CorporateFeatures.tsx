"use client";

import { Shield, BarChart3, Users, Globe, Clock, FileText, Headphones, Lock } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 Type II certified. End-to-end encryption. Regular security audits.",
    color: "text-blue-600",
    bgGradient: "from-blue-50 to-indigo-50"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time dashboards. Custom reports. Performance insights and trends.",
    color: "text-indigo-600",
    bgGradient: "from-indigo-50 to-purple-50"
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Role-based access control. Team collaboration. Permission management.",
    color: "text-green-600",
    bgGradient: "from-green-50 to-emerald-50"
  },
  {
    icon: Globe,
    title: "Global Compliance",
    description: "GDPR compliant. Multi-region hosting. Local data residency options.",
    color: "text-purple-600",
    bgGradient: "from-purple-50 to-pink-50"
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Dedicated account manager. Priority support. SLA guarantees.",
    color: "text-red-600",
    bgGradient: "from-red-50 to-orange-50"
  },
  {
    icon: FileText,
    title: "Custom Reporting",
    description: "Bespoke reports. API access. Data export in multiple formats.",
    color: "text-yellow-600",
    bgGradient: "from-yellow-50 to-amber-50"
  },
  {
    icon: Headphones,
    title: "Training & Onboarding",
    description: "Professional training. Documentation. Video tutorials and webinars.",
    color: "text-cyan-600",
    bgGradient: "from-cyan-50 to-blue-50"
  },
  {
    icon: Lock,
    title: "Data Privacy",
    description: "Zero-knowledge architecture. Private cloud options. Data sovereignty.",
    color: "text-gray-600",
    bgGradient: "from-gray-50 to-slate-50"
  }
];

export function CorporateFeatures() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Enterprise Features
            <span className="block text-blue-600 mt-2">Built for Scale</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive platform capabilities designed for large-scale tournament operations
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`bg-gradient-to-br ${feature.bgGradient} rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 rounded-full border border-blue-200">
            <div className="w-2 h-2 bg-blue-600 rounded-full" />
            <span className="text-blue-700 font-semibold">Schedule Enterprise Demo</span>
          </div>
        </div>
      </div>
    </section>
  );
}
