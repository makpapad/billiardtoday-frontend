import { ArrowRight, Sparkles } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-[#0a0e1a] to-[#111827] relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00d9ff]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-[#1a2235] border border-[#00ff88]/30 rounded-full">
          <Sparkles className="w-4 h-4 text-[#00ff88]" />
          <span className="text-[#00ff88] uppercase tracking-wider">Ξεκίνα Τώρα</span>
        </div>

        <h2 className="mb-6">
          Έτοιμος να Δημιουργήσεις το<br />
          Επόμενο Μεγάλο Τουρνουά;
        </h2>

        <p className="max-w-2xl mx-auto mb-12 text-[#94a3b8]">
          Εγγραφή δωρεάν, χωρίς δέσμευση. Ξεκινήστε να οργανώνετε επαγγελματικά 
          τουρνουά σε λιγότερο από 5 λεπτά.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <button className="group px-8 py-4 bg-[#00ff88] text-[#0a0e1a] rounded-lg hover:bg-[#00ff88]/90 transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] flex items-center gap-2">
            Δημιούργησε Τουρνουά
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 bg-transparent border-2 border-[#00d9ff] text-[#00d9ff] rounded-lg hover:bg-[#00d9ff]/10 transition-all">
            Περιήγηση Τουρνουά
          </button>
        </div>

        {/* Feature highlights */}
        <div className="flex flex-wrap justify-center gap-6 text-[#64748b]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full"></div>
            <span>Δωρεάν εγγραφή</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#00d9ff] rounded-full"></div>
            <span>Χωρίς πιστωτική κάρτα</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#ffd600] rounded-full"></div>
            <span>Setup σε 5 λεπτά</span>
          </div>
        </div>
      </div>
    </section>
  );
}
