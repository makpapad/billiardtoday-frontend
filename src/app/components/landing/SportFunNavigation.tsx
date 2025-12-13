"use client";

import { useState } from "react";
import { Menu, X, Gamepad2, Globe } from "lucide-react";

export function SportFunNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-400 to-pink-400 backdrop-blur-lg border-b-4 border-white/30">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-4 border-white/50">
              <Gamepad2 className="w-7 h-7 text-orange-500" />
            </div>
            <span className="text-3xl font-black text-white">BilliardToday</span>
            <span className="text-xl font-black text-yellow-300 animate-pulse">FUN!</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">FUN FEATURES! 🎮</a>
            <a href="#how-it-works" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">HOW TO PLAY! 🎯</a>
            <a href="#tournaments" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">TOURNAMENTS! 🏆</a>
            <a href="#pricing" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">PRICING! 💰</a>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full border-2 border-white/50">
              <Globe className="w-5 h-5 text-white" />
              <select className="bg-transparent text-sm text-white font-black outline-none">
                <option>ΕΛ 🇬🇷</option>
                <option>EN 🇺🇸</option>
              </select>
            </div>
            <button className="px-6 py-3 bg-yellow-400 text-gray-900 font-black rounded-xl hover:bg-yellow-300 transition-all duration-300 transform hover:scale-110 border-4 border-white">
              START FUN! 🎉
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pt-4 border-t-4 border-white/30">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">FUN FEATURES! 🎮</a>
              <a href="#how-it-works" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">HOW TO PLAY! 🎯</a>
              <a href="#tournaments" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">TOURNAMENTS! 🏆</a>
              <a href="#pricing" className="text-white hover:text-yellow-300 transition-colors font-black text-lg">PRICING! 💰</a>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full border-2 border-white/50">
                <Globe className="w-5 h-5 text-white" />
                <select className="bg-transparent text-sm text-white font-black outline-none">
                  <option>ΕΛ 🇬🇷</option>
                  <option>EN 🇺🇸</option>
                </select>
              </div>
              <button className="px-6 py-3 bg-yellow-400 text-gray-900 font-black rounded-xl border-4 border-white">
                START FUN! 🎉
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
