export function OriginalLightFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full" />
              </div>
              <span className="text-2xl font-bold text-gray-900">BilliardToday</span>
            </div>
            <p className="text-gray-600 mb-4">
              The ultimate platform for billiard tournament management and live scoring. 
              Join thousands of players and organizers worldwide.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer hover:bg-gray-200">
                <span className="text-xs">f</span>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer hover:bg-gray-200">
                <span className="text-xs">t</span>
              </div>
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer hover:bg-gray-200">
                <span className="text-xs">in</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Tournaments</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Live Scoring</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Analytics</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">About</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 mb-4 md:mb-0">
              © 2024 BilliardToday. All rights reserved. Built with ❤️ for billiard enthusiasts.
            </p>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
