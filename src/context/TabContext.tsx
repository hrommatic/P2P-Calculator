import React, { createContext, useContext } from 'react';

export type AppTab =
  | 'dashboard'
  | 'calculator'
  | 'banks'
  | 'history'
  | 'settings'
  | 'support'
  | 'admin';

const TabContext = createContext<AppTab>('dashboard');

export const TabProvider: React.FC<{
  tab: AppTab;
  children: React.ReactNode;
}> = ({ tab, children }) => (
  <TabContext.Provider value={tab}>{children}</TabContext.Provider>
);

export function useCurrentTab(): AppTab {
  return useContext(TabContext);
}
