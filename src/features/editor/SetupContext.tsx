import { createContext, use, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

interface SetupContextValue {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
}

const SetupContext = createContext<SetupContextValue>({ step: 1, setStep: () => {} });

export function SetupProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const value = useMemo(() => ({ step, setStep }), [step]);
  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSetupContext() {
  return use(SetupContext);
}
