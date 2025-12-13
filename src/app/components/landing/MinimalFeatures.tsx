export function MinimalFeatures() {
  const features = [
    {
      title: "Live Scoring",
      description: "Real-time score updates and match tracking"
    },
    {
      title: "Tournament Brackets",
      description: "Automatic bracket generation and management"
    },
    {
      title: "Player Analytics",
      description: "Detailed performance statistics and insights"
    },
    {
      title: "Club Management",
      description: "Complete tournament organization tools"
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl font-light text-gray-900 text-center mb-12">
          Everything You Need
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {features.map((feature, index) => (
            <div key={feature.title} className="text-center">
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
