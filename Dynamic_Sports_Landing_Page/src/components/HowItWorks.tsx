import { PlusCircle, Play, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: PlusCircle,
    step: "01",
    title: "Δημιούργησε Τουρνουά",
    description: "Όρισε τους κανόνες, τη μορφή του τουρνουά (single/double elimination, round robin), και προσκάλεσε παίκτες.",
    color: "#00ff88"
  },
  {
    icon: Play,
    step: "02",
    title: "Διεξαγωγή Αγώνων",
    description: "Παρακολούθησε live τους αγώνες, ενημέρωσε τα scores σε πραγματικό χρόνο, και διαχειρίσου το bracket.",
    color: "#00d9ff"
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Αποτελέσματα & Rankings",
    description: "Αυτόματη ανακοίνωση νικητών, ενημέρωση κατατάξεων, και αναλυτικά στατιστικά για όλους τους παίκτες.",
    color: "#ffd600"
  }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-gradient-to-b from-[#111827] to-[#0a0e1a] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00ff88]/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 mb-6 bg-[#00d9ff]/10 border border-[#00d9ff]/30 rounded-full">
            <span className="text-[#00d9ff] uppercase tracking-wider">Διαδικασία</span>
          </div>
          
          <h2 className="mb-4">
            Πώς Λειτουργεί
          </h2>
          
          <p className="max-w-2xl mx-auto text-[#94a3b8]">
            Τρία απλά βήματα για να ξεκινήσεις το επόμενο επαγγελματικό τουρνουά μπιλιάρδου.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connection lines - desktop only */}
          <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00ff88] via-[#00d9ff] to-[#ffd600] opacity-20"></div>
          
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative"
            >
              {/* Step number circle */}
              <div className="flex items-center justify-center mb-6">
                <div 
                  className="w-16 h-16 rounded-full border-2 flex items-center justify-center relative z-10 bg-[#1a2235]"
                  style={{ borderColor: step.color }}
                >
                  <span 
                    className="tracking-wider"
                    style={{ color: step.color }}
                  >
                    {step.step}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="text-center p-6 bg-[#1a2235]/50 backdrop-blur-sm border border-[#1e293b] rounded-xl">
                <div 
                  className="w-14 h-14 mx-auto mb-4 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  <step.icon 
                    className="w-7 h-7" 
                    style={{ color: step.color }}
                  />
                </div>
                
                <h3 className="mb-3">{step.title}</h3>
                
                <p className="text-[#94a3b8]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
