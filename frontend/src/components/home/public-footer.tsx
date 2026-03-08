export function PublicFooter() {
  const links = ['Terms of Use', 'Privacy Policy', 'Refund Policy', 'Company'];

  return (
    <footer className="mt-28 pb-12 px-6">
      <div className="max-w-5xl mx-auto border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-text-muted text-xs">
          © {new Date().getFullYear()} AstroLogAI
        </p>
        <div className="flex items-center gap-6 flex-wrap justify-center">
          {links.map((link) => (
            <a key={link} href="#" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
