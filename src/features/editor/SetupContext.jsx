import { createContext, use, useMemo, useState } from 'react';

const SetupContext = createContext({ step: 1, setStep: () => {} });

export function SetupProvider({ children }) {
  const [step, setStep] = useState(1);
  const value = useMemo(() => ({ step, setStep }), [step]);
  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSetupContext() {
  return use(SetupContext);
}
