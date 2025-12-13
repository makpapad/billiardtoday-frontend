export function MinimalFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-lg font-light text-gray-900">BilliardToday</span>
          </div>
          
          <div className="flex gap-8 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900 transition-colors">About</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>
        </div>
        
        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            © 2024 BilliardToday. Built for billiard enthusiasts.
          </p>
        </div>
      </div>
    </footer>
  );
}
