export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            CrowdScope
          </h1>
          
          <h2 className="text-xl md:text-2xl text-gray-600 mb-12">
            Track trends and insights in population groups over time
          </h2>

          {/* Image Placeholder */}
          <div className="bg-gray-100 rounded-lg p-16 mb-12">
            <div className="text-gray-500 text-lg">
              📊 Survey Visualization Coming Soon
            </div>
          </div>

          {/* Description */}
          <div className="text-left max-w-3xl mx-auto space-y-6 text-gray-700">
            <p className="text-lg leading-relaxed">
              CrowdScope enables you to create <strong>signals</strong> - automated survey campaigns that run daily to capture real human insights. 
              Track how public opinion changes over time on topics that matter to you.
            </p>
            
            <p className="text-lg leading-relaxed">
              Whether you want to understand Bitcoin sentiment, political preferences, or consumer behavior, 
              CrowdScope collects authentic responses from real people and visualizes trends you won't find anywhere else.
            </p>

            <p className="text-lg leading-relaxed">
              Set your question, choose your answer options, specify how many responses you want daily, 
              and watch as patterns emerge from the crowd.
            </p>
          </div>

          {/* CTA Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-lg">
              Coming Soon - Get insights into the crowd like never before
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
