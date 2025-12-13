export function DarkModernFooter() {
  return (
    <footer className="bg-black border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full" />
              </div>
              <span className="text-2xl font-black text-white">BILLIARDTODAY</span>
            </div>
            <p className="text-gray-400 mb-4 font-light">
              The ultimate tournament platform for champions. 
              Next-generation technology meets billiard excellence.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer hover:bg-white/10 border border-white/10">
                <span className="text-xs font-black">F</span>
              </div>
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer hover:bg-white/10 border border-white/10">
                <span className="text-xs font-black">T</span>
              </div>
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer hover:bg-white/10 border border-white/10">
                <span className="text-xs font-black">IN</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-black mb-4">PRODUCT</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Tournaments</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Live Scoring</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Analytics</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-4">COMPANY</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-medium">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0 font-light">
              © 2024 BILLIARDTODAY. ALL RIGHTS RESERVED. BUILT FOR CHAMPIONS.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors font-medium">Privacy</a>
              <a href="#" className="hover:text-white transition-colors font-medium">Terms</a>
              <a href="#" className="hover:text-white transition-colors font-medium">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
