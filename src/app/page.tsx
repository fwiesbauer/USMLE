import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-light to-white">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-brand-dark">QuizForge</h1>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-brand-mid hover:text-brand-dark"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-lg bg-brand-mid px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <h2 className="text-5xl font-bold text-brand-dark mb-6 leading-tight">
          Turn any PDF into a
          <br />
          USMLE-style quiz
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Upload a clinical guideline, article, or textbook chapter. QuizForge
          uses AI to generate high-quality multiple choice questions in minutes,
          not hours.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center rounded-lg bg-brand-mid px-8 py-3 text-lg font-medium text-white hover:bg-brand-dark transition-colors shadow-lg"
        >
          Create Your First Quiz
        </Link>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20 text-left">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-bold text-gray-900 mb-2">Upload a PDF</h3>
            <p className="text-sm text-gray-600">
              Drag and drop any clinical document. We extract the text and
              prepare it for question generation.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-bold text-gray-900 mb-2">AI Generates Questions</h3>
            <p className="text-sm text-gray-600">
              Claude creates USMLE Step 2 CK–style questions with clinical
              vignettes, explanations, and key pearls.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="font-bold text-gray-900 mb-2">Share a Link</h3>
            <p className="text-sm text-gray-600">
              Publish and share a magic link. Students take the quiz on any
              device — no login required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
