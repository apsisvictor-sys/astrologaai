'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Sparkles, Menu, X } from 'lucide-react';

export function GlobalNav() {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Routes where the global nav should NOT appear (e.g., app interior, auth)
    const isHiddenRoute = pathname.includes('/dashboard') ||
        pathname.includes('/login') ||
        pathname.includes('/register') ||
        pathname.includes('/chat');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (isHiddenRoute) return null;

    const navLinks = [
        { name: 'Home', href: '/' },
        { name: 'Cosmic Features', href: '/features' },
        { name: 'Zodiac Insights', href: '/zodiac' },
        { name: 'The Oracle (Pricing)', href: '/pricing' },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
                    ? 'bg-background-dark/80 backdrop-blur-2xl border-b border-border-glass py-4 shadow-panel'
                    : 'bg-transparent py-6'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* Brand Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-background-deep border border-primary/30 group-hover:border-primary transition-colors shadow-glow overflow-hidden">
                        <Sparkles className="w-5 h-5 text-primary-light" />
                    </div>
                    <span className="font-display font-bold text-xl tracking-wide text-white group-hover:text-primary-light transition-colors">
                        Void Prism
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8 bg-surface-elevated/40 backdrop-blur-md px-8 py-3 rounded-full border border-border-glass">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-text-secondary hover:text-white transition-colors tracking-wide"
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Call to Action CTA */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/login" className="text-sm font-bold text-text-muted hover:text-white transition-colors">
                        Sign In
                    </Link>
                    <Link href="/register" className="px-5 py-2.5 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-light border border-primary/50 text-sm font-bold transition-all shadow-glow hover:shadow-[0_0_20px_rgba(228,26,255,0.4)]">
                        Consult Oracle
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-text-secondary hover:text-white p-2"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-background-deep border-b border-border-glass p-6 flex flex-col gap-4 shadow-2xl backdrop-blur-2xl">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="text-lg font-medium text-text-secondary hover:text-white border-b border-border-glass pb-4"
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="flex flex-col gap-3 mt-2">
                        <Link href="/login" className="text-center py-3 text-white font-bold border border-white/10 rounded-xl">
                            Sign In
                        </Link>
                        <Link href="/register" className="text-center py-3 bg-gradient-to-r from-primary to-accent-blue text-white font-bold rounded-xl shadow-glow">
                            Consult Oracle
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
