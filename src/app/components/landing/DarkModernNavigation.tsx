"use client";

import { useState } from "react";
import { Menu, X, Play, Globe, Zap } from "lucide-react";

export function DarkModernNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white">BILLIARDTODAY</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors font-medium">FEATURES</a>
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors font-medium">HOW IT WORKS</a>
            <a href="#tournaments" className="text-gray-400 hover:text-white transition-colors font-medium">TOURNAMENTS</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors font-medium">PRICING</a>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <Globe className="w-4 h-4 text-gray-400" />
              <select className="bg-transparent text-sm text-gray-400 outline-none font-medium">
                <option>ΕΛ</option>
                <option>EN</option>
              </select>
            </div>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300">
              GET STARTED
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-white/10">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors font-medium">FEATURES</a>
              <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors font-medium">HOW IT WORKS</a>
              <a href="#tournaments" className="text-gray-400 hover:text-white transition-colors font-medium">TOURNAMENTS</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors font-medium">PRICING</a>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <Globe className="w-4 h-4 text-gray-400" />
                <select className="bg-transparent text-sm text-gray-400 outline-none font-medium">
                  <option>ΕΛ</option>
                  <option>EN</option>
                </select>
              </div>
              <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-lg">
                GET STARTED
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
