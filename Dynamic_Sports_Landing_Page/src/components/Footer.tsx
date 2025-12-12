export function Footer() {
  return (
    <footer className="py-12 px-6 bg-[#0a0e1a] border-t border-[#1e293b]">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#00ff88] to-[#00d9ff] rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white rounded-full"></div>
              </div>
              <span className="text-xl tracking-tight">BilliardToday</span>
            </div>
            <p className="text-[#64748b]">
              Η κορυφαία πλατφόρμα για τουρνουά μπιλιάρδου στην Ελλάδα.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="mb-4 text-white">Πλατφόρμα</h4>
            <ul className="space-y-2 text-[#64748b]">
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Χαρακτηριστικά</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Τιμές</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Οδηγός Χρήσης</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">API</a></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="mb-4 text-white">Κοινότητα</h4>
            <ul className="space-y-2 text-[#64748b]">
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Τουρνουά</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Κατατάξεις</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Λέσχες</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-white">Υποστήριξη</h4>
            <ul className="space-y-2 text-[#64748b]">
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Επικοινωνία</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Όροι Χρήσης</a></li>
              <li><a href="#" className="hover:text-[#00ff88] transition-colors">Απόρρητο</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[#1e293b] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#64748b]">
            © 2025 BilliardToday. Με επιφύλαξη παντός δικαιώματος.
          </p>
          <div className="flex gap-6 text-[#64748b]">
            <a href="#" className="hover:text-[#00ff88] transition-colors">Facebook</a>
            <a href="#" className="hover:text-[#00ff88] transition-colors">Instagram</a>
            <a href="#" className="hover:text-[#00ff88] transition-colors">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
