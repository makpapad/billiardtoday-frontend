export function CorporateFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Logo */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full" />
              </div>
              <span className="text-2xl font-bold text-gray-900">BilliardToday</span>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Enterprise-grade tournament management platform trusted by leading organizations worldwide. 
              Scalable, secure, and reliable solutions for professional billiard competitions.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer hover:bg-gray-200">
                <span className="text-sm font-semibold">f</span>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer hover:bg-gray-200">
                <span className="text-sm font-semibold">t</span>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors cursor-pointer hover:bg-gray-200">
                <span className="text-sm font-semibold">in</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-gray-900 font-bold mb-4">Product</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Enterprise</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Security</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">API</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold mb-4">Solutions</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Tournaments</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Clubs</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Associations</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Players</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">About</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Blog</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 mb-4 md:mb-0">
              © 2024 BilliardToday. All rights reserved. Enterprise solutions for professional tournaments.
            </p>
            <div className="flex gap-8 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Compliance</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
