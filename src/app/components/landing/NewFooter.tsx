export function NewFooter() {
  return (
    <footer className="bg-slate-900 border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full" />
              </div>
              <span className="text-2xl font-bold text-white">BilliardToday</span>
            </div>
            <p className="text-gray-400 mb-4">
              The ultimate platform for billiard tournament management and live scoring.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
                <span className="text-xs">f</span>
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
                <span className="text-xs">t</span>
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer">
                <span className="text-xs">in</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tournaments</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 BilliardToday. All rights reserved. Built with ❤️ for billiard enthusiasts.
          </p>
        </div>
      </div>
    </footer>
  );
}
