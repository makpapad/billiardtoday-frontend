export function SportFunFooter() {
  return (
    <footer className="bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 border-t-4 border-white/50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-4 border-white/50">
                <span className="text-2xl">🎱</span>
              </div>
              <span className="text-3xl font-black text-white">BilliardToday</span>
              <span className="text-xl font-black text-yellow-300">FUN!</span>
            </div>
            <p className="text-white/90 mb-6 text-lg font-bold leading-relaxed">
              The most AWESOME place for billiard tournaments! 🎉 
              Play with friends, win prizes, and have TONS of FUN! 🌟
            </p>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer border-2 border-white/50">
                <span className="text-lg font-black">F</span>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer border-2 border-white/50">
                <span className="text-lg font-black">T</span>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer border-2 border-white/50">
                <span className="text-lg font-black">IN</span>
              </div>
            </div>
          </div>

          {/* Fun Links */}
          <div>
            <h4 className="text-white font-black mb-4 text-xl">FUN STUFF! 🎮</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">Play Now! 🎯</a></li>
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">Tournaments! 🏆</a></li>
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">Leaderboard! 🥇</a></li>
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">Prizes! 🎁</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-4 text-xl">MORE FUN! 🎉</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">About Fun! 🌟</a></li>
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">Fun Blog! 📝</a></li>
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">Help! 🆘</a></li>
              <li><a href="#" className="text-white/90 hover:text-yellow-300 transition-colors font-bold text-lg">Contact! 📞</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t-4 border-white/30 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/90 mb-4 md:mb-0 text-lg font-bold">
              © 2024 BilliardToday FUN! All rights reserved. Made with ❤️ and TONS of FUN! 🎊
            </p>
            <div className="flex gap-8 text-lg text-white/90 font-bold">
              <a href="#" className="hover:text-yellow-300 transition-colors">Privacy! 🔒</a>
              <a href="#" className="hover:text-yellow-300 transition-colors">Terms! 📋</a>
              <a href="#" className="hover:text-yellow-300 transition-colors">Cookies! 🍪</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
