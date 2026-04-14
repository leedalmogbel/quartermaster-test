import { useState } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/toaster";

import Dashboard from "@/pages/dashboard";
import PerfectPnL from "@/pages/perfect-pnl";
import Forecasting from "@/pages/forecasting";
import CfoScript from "@/pages/cfo-script";
import ActionItems from "@/pages/action-items";
import PracticeNotes from "@/pages/practice-notes";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

// Context to share practiceId across pages
import { createContext, useContext } from "react";

interface PracticeContextValue {
  practiceId: number;
  setPracticeId: (id: number) => void;
}

export const PracticeContext = createContext<PracticeContextValue>({
  practiceId: 1,
  setPracticeId: () => {},
});

export function usePractice() {
  return useContext(PracticeContext);
}

function AppLayout() {
  const [practiceId, setPracticeId] = useState(1);

  return (
    <PracticeContext.Provider value={{ practiceId, setPracticeId }}>
      <Router hook={useHashLocation}>
        <div className="flex h-screen overflow-hidden bg-background">
          <AppSidebar practiceId={practiceId} onPracticeChange={setPracticeId} />
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/ppl" component={PerfectPnL} />
              <Route path="/forecast" component={Forecasting} />
              <Route path="/cfo-script" component={CfoScript} />
              <Route path="/actions" component={ActionItems} />
              <Route path="/notes" component={PracticeNotes} />
              <Route path="/admin" component={Admin} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </Router>
      <Toaster />
    </PracticeContext.Provider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppLayout />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
