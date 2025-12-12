import { Trophy, Activity, BarChart3, Users, Timer, Award } from "lucide-react";

const features = [
  {
    icon: Trophy,
    title: "Διοργάνωση Τουρνουά",
    description: "Δημιούργησε επαγγελματικά τουρνουά με αυτοματοποιημένη κλήρωση και bracket generation.",
    color: "#00ff88"
  },
  {
    icon: Activity,
    title: "Live Scores",
    description: "Ενημέρωση αποτελεσμάτων σε πραγματικό χρόνο. Όλοι οι παίκτες και φίλαθλοι ενημερωμένοι.",
    color: "#00d9ff"
  },
  {
    icon: BarChart3,
    title: "Αποτελέσματα & Stats",
    description: "Λεπτομερή στατιστικά, ιστορικό αγώνων και αναλυτικές αναφορές για κάθε παίκτη.",
    color: "#ffd600"
  },
  {
    icon: Users,
    title: "Διαχείριση Παικτών",
    description: "Εγγραφή παικτών, δημιουργία προφίλ, ranking system και leaderboards.",
    color: "#ff3366"
  },
  {
    icon: Timer,
    title: "Χρονομέτρηση Αγώνων",
    description: "Ενσωματωμένο σύστημα χρονομέτρησης για επαγγελματική διεξαγωγή αγώνων.",
    color: "#00ff88"
  },
  {
    icon: Award,
    title: "Κατατάξεις & Rankings",
    description: "Αυτόματη ενημέρωση κατατάξεων, ELO rating system και hall of fame.",
    color: "#00d9ff"
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 px-6 bg-[#111827]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 mb-6 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-full">
            <span className="text-[#00ff88] uppercase tracking-wider">Χαρακτηριστικά</span>
          </div>
          
          <h2 className="mb-4">
            Όλα Όσα Χρειάζεσαι για Επαγγελματικά Τουρνουά
          </h2>
          
          <p className="max-w-2xl mx-auto text-[#94a3b8]">
            Ολοκληρωμένη λύση με όλα τα εργαλεία που χρειάζεσαι για να οργανώσεις, 
            να διεξάγεις και να παρακολουθείς τουρνουά μπιλιάρδου.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-6 bg-[#1a2235] border border-[#1e293b] rounded-xl hover:border-[#334155] transition-all hover:transform hover:scale-105"
            >
              <div 
                className="w-14 h-14 mb-4 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${feature.color}20` }}
              >
                <feature.icon 
                  className="w-7 h-7" 
                  style={{ color: feature.color }}
                />
              </div>
              
              <h3 className="mb-3">{feature.title}</h3>
              
              <p className="text-[#94a3b8]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
