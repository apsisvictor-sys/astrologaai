/**
 * Partners Page
 * US-18: Add Partner - Main partner management page
 * 
 * Route: /partners (Bulgarian default) or /en/partners (English)
 * 
 * Features:
 * - List all partners
 * - Add new partner
 * - Edit existing partner
 * - Delete partner
 * 
 * Design: Follows 06-ux-ui-design.md specifications
 * - Background: #050510 (Cosmic Black)
 * - Surface: #0A0A1F (Nebula Dark)
 * - Border: #1A1A3A (Nebula Light)
 * - Primary CTA Gradient: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { Navigation } from '@/components/navigation';
import { PartnerForm } from '@/components/partners/partner-form';
import { PartnerCard } from '@/components/partners/partner-card';
import { Partner, partnersApi, PartnersAPIError } from '@/lib/partners-api';
import { useAuth } from '@/lib/auth-context';

export default function PartnersPage() {
  const t = useTranslations('partners');
  const tCommon = useTranslations('common');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const language = (user?.language as 'bg' | 'en') || 'bg';

  // State
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch partners on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchPartners();
    }
  }, [isAuthenticated]);

  const fetchPartners = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await partnersApi.list();
      setPartners(data);
    } catch (err) {
      if (err instanceof PartnersAPIError) {
        setError(err.message);
      } else {
        setError(t('errorLoading'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingPartner(null);
    setShowForm(true);
  };

  const handleEditClick = (partner: Partner) => {
    setEditingPartner(partner);
    setShowForm(true);
  };

  const handleDeleteClick = async (partner: Partner) => {
    if (!confirm(t('deleteConfirm'))) return;
    
    try {
      await partnersApi.delete(partner.id);
      setPartners(partners.filter(p => p.id !== partner.id));
    } catch (err) {
      if (err instanceof PartnersAPIError) {
        alert(err.message);
      }
    }
  };

  const handleFormSuccess = (partner: Partner) => {
    setShowForm(false);
    setEditingPartner(null);

    if (editingPartner) {
      // Update existing partner in list
      setPartners(partners.map(p => p.id === partner.id ? partner : p));
    } else {
      // Add new partner to list
      setPartners([partner, ...partners]);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPartner(null);
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#050510' }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ 
              borderColor: 'rgba(124, 58, 237, 0.3)',
              borderTopColor: '#8B5CF6',
            }}
          />
          <p style={{ color: '#CBD5E1' }}>{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  // Show form modal
  if (showForm) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#050510' }}
      >
        <div className="relative w-full max-w-lg">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleFormCancel}
          />
          
          {/* Form */}
          <div className="relative z-10">
            <PartnerForm
              partner={editingPartner}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              language={language}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ background: '#050510' }}
    >
      <Navigation currentPath="/partners" />

      <main className="max-w-5xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/chat')}
            className="inline-block mb-4 text-sm hover:underline"
            style={{ color: '#8B5CF6' }}
          >
            ← {t('backToChat')}
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 
                className="text-3xl font-bold mb-2"
                style={{ 
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('title')}
              </h1>
              <p style={{ color: '#CBD5E1' }}>{t('subtitle')}</p>
            </div>

            <button
              onClick={handleAddClick}
              className="px-6 py-3 rounded-xl font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                color: '#FAFAFA',
              }}
            >
              + {t('addPartner')}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div 
            className="p-4 rounded-xl mb-6"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
          >
            {error}
          </div>
        )}

        {/* Partners Grid */}
        {partners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partners.map(partner => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                language={language}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div 
            className="text-center py-16 rounded-2xl"
            style={{ background: '#0A0A1F', border: '1px solid #1A1A3A' }}
          >
            <div className="text-6xl mb-4">💕</div>
            <h3 
              className="text-xl font-bold mb-2"
              style={{ color: '#F8FAFC' }}
            >
              {t('noPartners')}
            </h3>
            <p 
              className="mb-6"
              style={{ color: '#64748B' }}
            >
              {t('noPartnersDesc')}
            </p>
            <button
              onClick={handleAddClick}
              className="px-6 py-3 rounded-xl font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                color: '#FAFAFA',
              }}
            >
              {t('firstPartner')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
