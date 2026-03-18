import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';

export default function EmailConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <Logo href="/" size="md" />
        </div>
        <div className="mb-4">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-bold text-brand-dark mb-2">
          Email confirmed
        </h1>
        <p className="text-gray-600 mb-6">
          Your account is ready. You can now sign in and start creating quizzes.
        </p>
        <Link
          href="/dashboard"
          className="inline-block w-full rounded-lg bg-brand-mid px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          Go to Dashboard
        </Link>
      </Card>
    </div>
  );
}
