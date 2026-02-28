/**
 * Navigation Component
 * Shared navigation for AstroLogAI pages
 * US-27: Includes language toggle in header
 */

'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { LanguageToggle } from '@/components/language-toggle';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}

export function Navigation({ currentPath }: { currentPath?: string }) {
  const { user, isAuthenticated, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const texts = {
    dashboard: t('navigation.home'),
    chat: t('navigation.chat'),
    forecast: t('navigation.forecast'),
    birthData: t('navigation.birthData'),
    partners: t('navigation.partners'),
    logout: t('navigation.logout'),
    login: t('navigation.login'),
  };

  const navItems: NavItem[] = [
    { href: '/chat', label: texts.chat, icon: '💬', active: currentPath === '/chat' },
    { href: '/forecast', label: texts.forecast, icon: '✨', active: currentPath === '/forecast' },
    { href: '/partners', label: texts.partners, icon: '💕', active: currentPath === '/partners' },
    { href: '/birth-data', label: texts.birthData, icon: '🌟', active: currentPath?.startsWith('/birth-data') },
  ];

  const handleLogout = async () => {
    signOut();
    router.push('/login');
  };

  return (
    <nav 
      className="sticky top-0 z-50 border-b backdrop-blur-sm"
      style={{ 
        background: 'rgba(10, 10, 31, 0.9)',
        borderColor: 'rgba(124, 58, 237, 0.2)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span 
              className="text-xl font-bold"
              style={{ 
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AstroLogAI ✦
            </span>
          </Link>

          {/* Navigation Items */}
          {isAuthenticated && (
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: item.active 
                      ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)'
                      : 'transparent',
                    color: item.active ? '#FAFAFA' : '#CBD5E1',
                    border: item.active ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid transparent',
                  }}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {/* Language Toggle - US-27 */}
            <LanguageToggle compact />
            
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-opacity-80"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                }}
              >
                {texts.logout}
              </button>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  color: '#FAFAFA',
                }}
              >
                {texts.login}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export function MobileNavigation({ currentPath }: { currentPath?: string }) {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  
  const texts = {
    chat: t('navigation.chat'),
    forecast: t('navigation.forecast'),
    partners: t('navigation.partners'),
    birthData: t('navigation.birthData'),
  };
  
  const navItems = [
    { href: '/chat', label: texts.chat, icon: '💬', active: currentPath === '/chat' },
    { href: '/forecast', label: texts.forecast, icon: '✨', active: currentPath === '/forecast' },
    { href: '/partners', label: texts.partners, icon: '💕', active: currentPath === '/partners' },
    { href: '/birth-data', label: texts.birthData, icon: '🌟', active: currentPath?.startsWith('/birth-data') },
  ];

  if (!isAuthenticated) return null;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 border-t sm:hidden"
      style={{ 
        background: '#0A0A1F',
        borderColor: 'rgba(124, 58, 237, 0.2)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-4 py-2"
            style={{
              color: item.active ? '#7C3AED' : '#CBD5E1',
            }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
