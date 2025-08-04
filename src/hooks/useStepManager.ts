import { useState, useCallback } from 'react';

export interface UseStepManagerReturn {
  currentStep: number;
  completedSteps: number[];
  completeStep: (step: number) => void;
  goToStep: (step: number) => void;
  isStepCompleted: (step: number) => boolean;
  isStepCurrent: (step: number) => boolean;
  isStepAccessible: (step: number) => boolean;
  resetSteps: () => void;
}

export const useStepManager = (
  totalSteps: number = 5
): UseStepManagerReturn => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const completeStep = useCallback(
    (step: number) => {
      setCompletedSteps(prev => {
        if (!prev.includes(step)) {
          return [...prev, step];
        }
        return prev;
      });

      // Auto-advance to next step if not at the end
      if (step < totalSteps) {
        setCurrentStep(step + 1);
      }
    },
    [totalSteps]
  );

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const isStepCompleted = useCallback(
    (step: number) => {
      return completedSteps.includes(step);
    },
    [completedSteps]
  );

  const isStepCurrent = useCallback(
    (step: number) => {
      return currentStep === step;
    },
    [currentStep]
  );

  const isStepAccessible = useCallback(
    (step: number) => {
      return step <= currentStep;
    },
    [currentStep]
  );

  const resetSteps = useCallback(() => {
    setCurrentStep(1);
    setCompletedSteps([]);
  }, []);

  return {
    currentStep,
    completedSteps,
    completeStep,
    goToStep,
    isStepCompleted,
    isStepCurrent,
    isStepAccessible,
    resetSteps,
  };
};
