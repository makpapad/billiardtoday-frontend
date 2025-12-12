import { Building2, UserCircle, Users2 } from "lucide-react";

const audiences = [
  {
    icon: Building2,
    title: "Λέσχες & Αίθουσες",
    description: "Διοργανώστε τακτικά τουρνουά, προσελκύστε νέους παίκτες και δημιουργήστε μια ζωντανή κοινότητα.",
    features: [
      "Διαχείριση πολλαπλών τουρνουά",
      "Προβολή της αίθουσάς σας",
      "Αυτόματη δημιουργία brackets",
      "Στατιστικά συμμετοχής"
    ],
    color: "#00ff88"
  },
  {
    icon: Users2,
    title: "Διοργανωτές",
    description: "Εργαλεία για επαγγελματική διοργάνωση τουρνουά με αυτοματοποίηση και real-time management.",
    features: [
      "Κεντρική διαχείριση αγώνων",
      "Live score updates",
      "Αυτόματες κλήρωσεις",
      "Εκτυπώσιμα brackets"
    ],
    color: "#00d9ff"
  },
  {
    icon: UserCircle,
    title: "Παίκτες",
    description: "Βρείτε τουρνουά, παρακολουθήστε την πρόοδό σας, και ανεβείτε στις κατατάξεις.",
    features: [
      "Προσωπικό προφίλ & στατιστικά",
      "Εγγραφή σε τουρνουά",
      "Ranking & leaderboards",
      "Ιστορικό αγώνων"
    ],
    color: "#ffd600"
  }
];

export function ForYou() {
  return (
    <section id="for-you" className="py-24 px-6 bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 mb-6 bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-full">
            <span className="text-[#ff3366] uppercase tracking-wider">Για Όλους</span>
          </div>
          
          <h2 className="mb-4">
            Λύσεις για Παίκτες & Συλλόγους
          </h2>
          
          <p className="max-w-2xl mx-auto text-[#94a3b8]">
            Ανεξάρτητα αν είστε λέσχη, διοργανωτής ή παίκτης, 
            το BilliardToday έχει τα εργαλεία που χρειάζεστε.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {audiences.map((audience, index) => (
            <div 
              key={index}
              className="p-8 bg-gradient-to-b from-[#1a2235] to-[#111827] border border-[#1e293b] rounded-2xl hover:border-[#334155] transition-all"
            >
              <div 
                className="w-16 h-16 mb-6 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${audience.color}20` }}
              >
                <audience.icon 
                  className="w-8 h-8" 
                  style={{ color: audience.color }}
                />
              </div>
              
              <h3 className="mb-4">{audience.title}</h3>
              
              <p className="mb-6 text-[#94a3b8]">
                {audience.description}
              </p>

              <ul className="space-y-3">
                {audience.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div 
                      className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: audience.color }}
                    ></div>
                    <span className="text-[#94a3b8]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
