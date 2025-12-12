import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-lg border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00ff88] to-[#00d9ff] rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white rounded-full"></div>
            </div>
            <span className="text-xl tracking-tight">BilliardToday</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#94a3b8] hover:text-white transition-colors">
              Χαρακτηριστικά
            </a>
            <a href="#how-it-works" className="text-[#94a3b8] hover:text-white transition-colors">
              Πώς Λειτουργεί
            </a>
            <a href="#for-you" className="text-[#94a3b8] hover:text-white transition-colors">
              Για Εσάς
            </a>
            <button className="px-6 py-2 bg-[#00ff88] text-[#0a0e1a] rounded-lg hover:bg-[#00ff88]/90 transition-all">
              Σύνδεση
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
          <div className="md:hidden mt-4 py-4 border-t border-[#1e293b]">
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-[#94a3b8] hover:text-white transition-colors">
                Χαρακτηριστικά
              </a>
              <a href="#how-it-works" className="text-[#94a3b8] hover:text-white transition-colors">
                Πώς Λειτουργεί
              </a>
              <a href="#for-you" className="text-[#94a3b8] hover:text-white transition-colors">
                Για Εσάς
              </a>
              <button className="px-6 py-2 bg-[#00ff88] text-[#0a0e1a] rounded-lg hover:bg-[#00ff88]/90 transition-all">
                Σύνδεση
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
