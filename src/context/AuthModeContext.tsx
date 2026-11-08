"use client";

import React, { createContext, useContext } from "react";

interface AuthModeContextType {
  authEnabled: boolean;
}

const AuthModeContext = createContext<AuthModeContextType>({ authEnabled: false });

export function useAuthMode(): AuthModeContextType {
  return useContext(AuthModeContext);
}

export function AuthModeProvider({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthModeContext.Provider value={{ authEnabled }}>
      {children}
    </AuthModeContext.Provider>
  );
}
