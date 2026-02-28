/**
 * Onboarding Tutorial Component
 * US-07: Onboarding Tutorial
 * 
 * Acceptance Criteria:
 * - Interactive tooltip tour on first login (skippable)
 * - Highlights: Chat, Natal Chart, Forecasts, Relationships sections
 * - Progress indicator shows how many steps remain
 * - User can replay tutorial from settings
 * - Tutorial completion status saved to user preferences
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTutorial({ onComplete, onSkip }: OnboardingTutorialProps) {
  const t = useTranslations();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Tutorial steps - highlights key features
  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: t('onboarding.steps.welcome.title'),
      description: t('onboarding.steps.welcome.description'),
      target: '[data-tour="dashboard"]',
      position: 'bottom',
    },
    {
      id: 'chat',
      title: t('onboarding.steps.chat.title'),
      description: t('onboarding.steps.chat.description'),
      target: '[data-tour="chat"]',
      position: 'right',
    },
    {
      id: 'natal-chart',
      title: t('onboarding.steps.natalChart.title'),
      description: t('onboarding.steps.natalChart.description'),
      target: '[data-tour="natal-chart"]',
      position: 'right',
    },
    {
      id: 'forecasts',
      title: t('onboarding.steps.forecasts.title'),
      description: t('onboarding.steps.forecasts.description'),
      target: '[data-tour="forecasts"]',
      position: 'right',
    },
    {
      id: 'relationships',
      title: t('onboarding.steps.relationships.title'),
      description: t('onboarding.steps.relationships.description'),
      target: '[data-tour="relationships"]',
      position: 'right',
    },
  ];

  // Update target position
  useEffect(() => {
    const updateTargetRect = () => {
      const step = steps[currentStep];
      if (step) {
        const targetElement = document.querySelector(step.target);
        if (targetElement) {
          setTargetRect(targetElement.getBoundingClientRect());
        }
      }
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [currentStep, steps]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    onSkip();
  }, [onSkip]);

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { display: 'none' };

    const step = steps[currentStep];
    const padding = 16;
    const tooltipWidth = 320;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = targetRect.top - padding - 150;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - 75;
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - 75;
        left = targetRect.right + padding;
        break;
    }

    // Keep within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - 200));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 9999,
    };
  };

  // Calculate highlight box
  const getHighlightStyle = (): React.CSSProperties => {
    if (!targetRect) return { display: 'none' };

    return {
      position: 'fixed',
      top: targetRect.top - 4,
      left: targetRect.left - 4,
      width: targetRect.width + 8,
      height: targetRect.height + 8,
      borderRadius: '8px',
      border: '2px solid #8B5CF6',
      boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
      pointerEvents: 'none',
      zIndex: 9998,
    };
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 9997 }}
        onClick={handleSkip}
      />

      {/* Highlight box */}
      <div style={getHighlightStyle()} />

      {/* Tooltip */}
      <div
        style={getTooltipStyle()}
        className="rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div
          className="p-5"
          style={{
            background: '#0A0A1F',
            border: '1px solid #1A1A3A',
            borderRadius: '12px',
          }}
        >
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span 
                className="text-xs font-medium"
                style={{ color: '#64748B' }}
              >
                {t('onboarding.progress', { current: currentStep + 1, total: steps.length })}
              </span>
              <button
                onClick={handleSkip}
                className="text-xs hover:underline"
                style={{ color: '#64748B' }}
              >
                {t('onboarding.skip')}
              </button>
            </div>
            <div 
              className="h-1 rounded-full overflow-hidden"
              style={{ background: '#1A1A3A' }}
            >
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                }}
              />
            </div>
          </div>

          {/* Step title */}
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: '#F8FAFC' }}
          >
            {step.title}
          </h3>

          {/* Step description */}
          <p 
            className="text-sm mb-5"
            style={{ color: '#CBD5E1' }}
          >
            {step.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{
                color: '#CBD5E1',
                background: currentStep === 0 ? 'transparent' : 'rgba(26, 26, 58, 0.8)',
                border: currentStep === 0 ? 'none' : '1px solid #1A1A3A',
              }}
            >
              {t('onboarding.previous')}
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:scale-105"
              style={{
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              }}
            >
              {currentStep === steps.length - 1 
                ? t('onboarding.finish') 
                : t('onboarding.next')
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
