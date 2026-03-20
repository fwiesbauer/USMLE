import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { SignOutButton } from '@/components/ui/SignOutButton';

interface Breadcrumb {
  label: string;
  href?: string;
}

export function AdminHeader({ breadcrumbs = [] }: { breadcrumbs?: Breadcrumb[] }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo href="/admin" size="sm" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            Admin
          </span>
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm text-gray-400">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>/</span>
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-gray-700">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-600">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Dashboard
          </Link>
          <SignOutButton className="text-sm text-gray-500 hover:text-gray-700" />
        </div>
      </div>
    </header>
  );
}
