export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-animated flex items-center justify-center p-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold mb-6 animate-bounce-slow">
              🚀 Powered by Google Gemini AI - 100% FREE
            </span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 animate-slide-in-left">
            AI Mock Interview
            <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Platform
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto animate-slide-in-right">
            Practice technical interviews with AI-powered adaptive questioning. 
            Get real-time feedback and improve your interview skills.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
            <a
              href="/auth/register"
              className="btn btn-primary text-lg px-8 py-4 bg-white text-purple-600 hover:bg-gray-50 shadow-2xl"
            >
              🎯 Get Started Free
            </a>
            <a
              href="/auth/login"
              className="btn text-lg px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/20"
            >
              🔐 Login
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="card-glass p-6 animate-fade-in" style={{animationDelay: '0.1s'}}>
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">AI-Powered Questions</h3>
            <p className="text-gray-600">
              Google Gemini generates personalized questions based on your resume and job description
            </p>
          </div>
          
          <div className="card-glass p-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Real-Time Evaluation</h3>
            <p className="text-gray-600">
              Get instant feedback on your answers with detailed scoring and improvement tips
            </p>
          </div>
          
          <div className="card-glass p-6 animate-fade-in" style={{animationDelay: '0.3s'}}>
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Performance Analytics</h3>
            <p className="text-gray-600">
              Track your progress over time with comprehensive performance reports
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="card-glass p-8 text-center animate-scale-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                100%
              </div>
              <div className="text-gray-600 font-semibold">Free Forever</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-success bg-clip-text text-transparent mb-2">
                AI
              </div>
              <div className="text-gray-600 font-semibold">Powered</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-warning bg-clip-text text-transparent mb-2">
                ⚡
              </div>
              <div className="text-gray-600 font-semibold">Instant Feedback</div>
            </div>
            <div>
              <div className="text-4xl font-bold bg-gradient-danger bg-clip-text text-transparent mb-2">
                📈
              </div>
              <div className="text-gray-600 font-semibold">Track Progress</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-white/70 animate-fade-in">
          <p className="text-sm">
            Powered by Google Gemini 1.5 Flash • No Credit Card Required • Start Practicing Now
          </p>
        </div>
      </div>
    </main>
  );
}
