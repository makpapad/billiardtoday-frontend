"use client";

import { ArrowRight, Building2, Users, Award, CheckCircle } from "lucide-react";

export function CorporateHero() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center overflow-hidden">
      {/* Professional Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        <div className="absolute inset-0 bg-grid-blue-100/[0.3] bg-[size:60px_60px]" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-blue-100 rounded-full filter blur-3xl opacity-30" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-indigo-100 rounded-full filter blur-3xl opacity-30" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Professional Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-8">
          <CheckCircle className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700 text-sm font-semibold">Enterprise-Grade Solution</span>
        </div>

        {/* Professional Title */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-gray-900">
          Professional
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Tournament Management
          </span>
        </h1>

        {/* Professional Subtitle */}
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
          Trusted by leading billiard organizations worldwide. 
          Comprehensive tournament platform with enterprise security, 
          advanced analytics, and dedicated support.
        </p>

        {/* Professional CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button className="group relative px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-300 hover:shadow-lg">
            <span className="flex items-center gap-2">
              Request Demo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          
          <button className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300">
            <span className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Enterprise Features
            </span>
          </button>
        </div>

        {/* Professional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-2">500+</div>
            <div className="text-gray-600 text-sm font-medium">Enterprise Clients</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <Users className="w-8 h-8 text-indigo-600 mx-auto mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-2">50K+</div>
            <div className="text-gray-600 text-sm font-medium">Professional Players</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <Award className="w-8 h-8 text-green-600 mx-auto mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-2">1000+</div>
            <div className="text-gray-600 text-sm font-medium">Tournaments</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-2">99.99%</div>
            <div className="text-gray-600 text-sm font-medium">Uptime SLA</div>
          </div>
        </div>
      </div>
    </section>
  );
}
