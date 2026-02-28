/**
 * Onboarding Hook
 * US-07: Onboarding Tutorial
 * 
 * Manages onboarding tutorial state and persistence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'astrologaai_onboarding_completed';

interface UseOnboardingReturn {
  showOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
  isCompleted: boolean;
}

export function useOnboarding(): UseOnboardingReturn {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if onboarding was already completed
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Check local storage first
        const localCompleted = localStorage.getItem(ONBOARDING_KEY);
        
        if (localCompleted === 'true') {
          setIsCompleted(true);
          setShowOnboarding(false);
          return;
        }

        // Check user preferences from API if logged in
        const storedUser = localStorage.getItem('astrologaai_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user.onboardingCompleted) {
            setIsCompleted(true);
            setShowOnboarding(false);
            return;
          }
        }

        // First time user - show onboarding
        setShowOnboarding(true);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      // Save to local storage
      localStorage.setItem(ONBOARDING_KEY, 'true');
      
      // Update user preferences if logged in
      const storedUser = localStorage.getItem('astrologaai_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.onboardingCompleted = true;
        localStorage.setItem('astrologaai_user', JSON.stringify(user));
        
        // TODO: Update user preferences via API
        // await fetch('/api/v1/user/preferences', {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ onboardingCompleted: true }),
        // });
      }

      setIsCompleted(true);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, []);

  const skipOnboarding = useCallback(async () => {
    // Same as complete - just mark as done
    await completeOnboarding();
  }, [completeOnboarding]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setIsCompleted(false);
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    isCompleted,
  };
}
