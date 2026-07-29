// components/Navbar.tsx
'use client';
import Link from 'next/link';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; // [ADDED] Import usePathname hook
import { Menu, X, Phone, Mail } from 'lucide-react';
import Image from 'next/image';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname(); // [ADDED] Get current route path

  // [ADDED] Do not render navbar on admin or portal routes (including sub-routes)
  const isAdminOrPortal = pathname.startsWith('/admin') || pathname.startsWith('/portal');
  if (isAdminOrPortal) {
    return null;
  }

  // Handle scroll effect for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking on a link
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about-us' },
    { name: 'Security Services', href: '/security-services' },
    { name: 'IT Services', href: '/it-security' },
    { name: 'Industries', href: '/#industries' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/95 backdrop-blur-md shadow-lg border-b border-slate-800'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 transition-transform duration-300 group-hover:scale-110">
              <Image
                src="/logo.png"
                alt="Sachin Security Services"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-xl font-bold text-white leading-tight">
                SACHIN SECURITY
              </h1>
              <p className="text-xs text-amber-400">Services Pvt. Ltd.</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-slate-300 hover:text-amber-400 transition-colors duration-300 font-medium relative group"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-400 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="tel:+916357889701"
              className="flex items-center gap-2 text-slate-300 hover:text-amber-400 transition-colors duration-300"
            >
              <Phone className="w-4 h-4" />
              <span className="text-sm">+91 6357889701</span>
            </Link>
            <Link
              href="/careers"
              className="bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]"
            >
              Join Us
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white p-2 hover:bg-slate-800 rounded-lg transition-colors duration-300"
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6">
              <Menu
                className={`w-6 h-6 absolute transition-all duration-300 ${
                  isOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'
                }`}
              />
              <X
                className={`w-6 h-6 absolute transition-all duration-300 ${
                  isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-slate-950/98 backdrop-blur-md border-t border-slate-800">
          <div className="container mx-auto px-6 py-6 space-y-4">
            {navLinks.map((link, index) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={handleLinkClick}
                className="block text-slate-300 hover:text-amber-400 hover:bg-slate-900 px-4 py-1 rounded-lg transition-all duration-300 font-medium"
                style={{
                  transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                  transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
                }}
              >
                {link.name}
              </Link>
            ))}

            {/* Mobile Contact Info */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <Link
                href="tel:+916357889701"
                className="flex items-center gap-3 text-slate-300 hover:text-amber-400 px-4 py-3 hover:bg-slate-900 rounded-lg transition-all duration-300"
              >
                <Phone className="w-5 h-5" />
                <span>+91 6357889701</span>
              </Link>
              <Link
                href="mailto:info@sachinsecurity.co.in"
                className="flex items-center gap-3 text-slate-300 hover:text-amber-400 px-4 py-3 hover:bg-slate-900 rounded-lg transition-all duration-300"
              >
                <Mail className="w-5 h-5" />
                <span>info@sachinsecurity.co.in</span>
              </Link>
            </div>

            {/* Mobile CTA Button */}
            <Link
              href="/careers"
              onClick={handleLinkClick}
              className="block bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-center px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] mt-4"
            >
              Join Us / Careers
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
