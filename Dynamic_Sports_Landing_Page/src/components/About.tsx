export function About() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-[#0a0e1a] to-[#111827]">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-4 py-1 mb-6 bg-[#00d9ff]/10 border border-[#00d9ff]/30 rounded-full">
              <span className="text-[#00d9ff] uppercase tracking-wider">Η Πλατφόρμα</span>
            </div>
            
            <h2 className="mb-6">
              Επαγγελματικό Σύστημα Διαχείρισης Τουρνουά
            </h2>
            
            <p className="mb-4 text-[#94a3b8]">
              Το BilliardToday είναι η κορυφαία πλατφόρμα για τη διοργάνωση και 
              παρακολούθηση επαγγελματικών τουρνουά μπιλιάρδου στην Ελλάδα.
            </p>
            
            <p className="mb-6 text-[#94a3b8]">
              Προσφέρουμε ολοκληρωμένα εργαλεία για λέσχες, διοργανωτές και παίκτες. 
              Από τη δημιουργία του τουρνουά μέχρι την ανακοίνωση των νικητών, 
              όλα σε μία πλατφόρμα.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#1a2235] border border-[#1e293b] rounded-lg">
                <div className="text-[#00ff88] mb-1">100%</div>
                <div className="text-[#64748b]">Real-time Updates</div>
              </div>
              <div className="p-4 bg-[#1a2235] border border-[#1e293b] rounded-lg">
                <div className="text-[#00d9ff] mb-1">24/7</div>
                <div className="text-[#64748b]">Υποστήριξη</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1732401575614-3464f8c0349b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb29sJTIwZ2FtZSUyMGNvbXBldGl0aXZlfGVufDF8fHx8MTc2NTUyNjA1NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Pool game"
              className="rounded-2xl border-2 border-[#1e293b] shadow-2xl"
            />
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-[#00ff88]/20 rounded-2xl blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
