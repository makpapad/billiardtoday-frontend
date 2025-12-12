import { Target, Trophy, Users } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1643818692075-5fc2933aa969?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWxsaWFyZHMlMjBwb29sJTIwdGFibGV8ZW58MXx8fHwxNzY1NTI2MDU0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Billiard table"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/85 via-[#0a0e1a]/80 to-[#0a0e1a]"></div>
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff88]/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d9ff]/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-[#1a2235] border border-[#00ff88]/30 rounded-full">
          <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse"></div>
          <span className="text-[#00ff88] uppercase tracking-wider">Ζωντανή Πλατφόρμα Τουρνουά</span>
        </div>

        <h1 className="mb-6 text-white drop-shadow-[0_2px_20px_rgba(0,255,136,0.3)]" style={{ textShadow: '0 0 80px rgba(0,255,136,0.4), 0 0 40px rgba(0,217,255,0.3)' }}>
          Διοργάνωσε & Παρακολούθησε<br />
          Τουρνουά Μπιλιάρδου
        </h1>

        <p className="max-w-2xl mx-auto mb-12 text-[#94a3b8]">
          Η ολοκληρωμένη πλατφόρμα για λέσχες, διοργανωτές και παίκτες. 
          Δημιούργησε επαγγελματικά τουρνουά, παρακολούθησε live scores, 
          κατατάξεις και αποτελέσματα σε πραγματικό χρόνο.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button className="group relative px-10 py-5 bg-[#00ff88] text-[#0a0e1a] rounded-lg overflow-hidden transition-all transform hover:scale-110 shadow-[0_0_40px_rgba(0,255,136,0.4)] hover:shadow-[0_0_60px_rgba(0,255,136,0.6)] border-2 border-[#00ff88]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="relative z-10 uppercase tracking-wide">Δημιούργησε Τουρνουά</span>
          </button>
          <button className="px-8 py-4 bg-transparent border-2 border-[#00d9ff] text-[#00d9ff] rounded-lg hover:bg-[#00d9ff]/10 transition-all">
            Δες Τουρνουά
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="group relative p-6 bg-gradient-to-br from-[#1a2235] to-[#0f1520] border-2 border-[#00ff88]/30 rounded-xl hover:border-[#00ff88]/60 transition-all shadow-[0_0_20px_rgba(0,255,136,0.15)]">
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse"></div>
              <span className="text-[10px] text-[#00ff88] uppercase tracking-wider">Live</span>
            </div>
            <Trophy className="w-10 h-10 text-[#00ff88] mx-auto mb-4 drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]" />
            <div className="text-[#00ff88] mb-2 tracking-tight">240+</div>
            <div className="text-[#94a3b8] uppercase tracking-wide">Ενεργά Τουρνουά</div>
          </div>
          <div className="group relative p-6 bg-gradient-to-br from-[#1a2235] to-[#0f1520] border-2 border-[#00d9ff]/30 rounded-xl hover:border-[#00d9ff]/60 transition-all shadow-[0_0_20px_rgba(0,217,255,0.15)]">
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#00d9ff] rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <span className="text-[10px] text-[#00d9ff] uppercase tracking-wider">Live</span>
            </div>
            <Users className="w-10 h-10 text-[#00d9ff] mx-auto mb-4 drop-shadow-[0_0_8px_rgba(0,217,255,0.5)]" />
            <div className="text-[#00d9ff] mb-2 tracking-tight">3,500+</div>
            <div className="text-[#94a3b8] uppercase tracking-wide">Εγγεγραμμένοι Παίκτες</div>
          </div>
          <div className="group relative p-6 bg-gradient-to-br from-[#1a2235] to-[#0f1520] border-2 border-[#ffd600]/30 rounded-xl hover:border-[#ffd600]/60 transition-all shadow-[0_0_20px_rgba(255,214,0,0.15)]">
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-[#ffd600] rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
              <span className="text-[10px] text-[#ffd600] uppercase tracking-wider">Live</span>
            </div>
            <Target className="w-10 h-10 text-[#ffd600] mx-auto mb-4 drop-shadow-[0_0_8px_rgba(255,214,0,0.5)]" />
            <div className="text-[#ffd600] mb-2 tracking-tight">12,000+</div>
            <div className="text-[#94a3b8] uppercase tracking-wide">Ολοκληρωμένοι Αγώνες</div>
          </div>
        </div>
      </div>
    </section>
  );
}