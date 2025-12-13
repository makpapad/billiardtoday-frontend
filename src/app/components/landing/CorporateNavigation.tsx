"use client";

import { useState } from "react";
import { Menu, X, Building2, Globe } from "lucide-react";

export function CorporateNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">BilliardToday</span>
            <span className="text-sm text-blue-600 font-semibold ml-2">Enterprise</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Features</a>
            <a href="#solutions" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Solutions</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Pricing</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">About</a>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
              <Globe className="w-4 h-4 text-gray-600" />
              <select className="bg-transparent text-sm text-gray-600 outline-none font-medium">
                <option>ΕΛ</option>
                <option>EN</option>
              </select>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              Request Demo
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Features</a>
              <a href="#solutions" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Solutions</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">Pricing</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">About</a>
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                <Globe className="w-4 h-4 text-gray-600" />
                <select className="bg-transparent text-sm text-gray-600 outline-none font-medium">
                  <option>ΕΛ</option>
                  <option>EN</option>
                </select>
              </div>
              <button className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg">
                Request Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
