import { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { memory } from "@/lib/layeredMemory";

const Index = lazy(() => import("./pages/Index.tsx"));
const SearchPage = lazy(() => import("./pages/SearchPage.tsx"));
const BookmarksPage = lazy(() => import("./pages/BookmarksPage.tsx"));
const HistoryPage = lazy(() => import("./pages/HistoryPage.tsx"));
const JudgmentDetailPage = lazy(() => import("./pages/JudgmentDetailPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const GovernmentDashboardLegacy = lazy(() => import("./pages/GovernmentDashboard.tsx"));
const ComplaintFormPage = lazy(() => import("./pages/ComplaintFormPage.tsx"));
const CitizenDashboard = lazy(() => import("./pages/CitizenDashboard.tsx"));
const JudgeDashboardLegacy = lazy(() => import("./pages/JudgeDashboard.tsx"));
const SystemDemoPage = lazy(() => import("./pages/SystemDemoPage.tsx"));
const RoleSimulatorPage = lazy(() => import("./pages/RoleSimulatorPage.tsx"));
const ITDashboardLegacy = lazy(() => import("./pages/ITDashboard.tsx"));
const NitiBenchPage = lazy(() => import("./pages/NitiBenchPage.tsx"));
const PredictPage = lazy(() => import("./pages/PredictPage.tsx"));
const GlossaryPage = lazy(() => import("./pages/GlossaryPage.tsx"));
const PromptsPage = lazy(() => import("./pages/PromptsPage.tsx"));
const GraphPage = lazy(() => import("./pages/GraphPage.tsx"));
const CourtsPage = lazy(() => import("./pages/CourtsPage.tsx"));
const ResponsibleAIPage = lazy(() => import("./pages/ResponsibleAIPage.tsx"));
const AnalyzeCasePage = lazy(() => import("./pages/AnalyzeCasePage.tsx"));
const TrustCenterPage = lazy(() => import("./pages/TrustCenterPage.tsx"));
const PrivateOfferingPage = lazy(() => import("./pages/PrivateOfferingPage.tsx"));
const BackOfficeHubPage = lazy(() => import("./pages/BackOfficeHubPage.tsx"));
const ClerkCopilotPage = lazy(() => import("./pages/ClerkCopilotPage.tsx"));
const JudgeWorkbenchPage = lazy(() => import("./pages/JudgeWorkbenchPage.tsx"));
const AIControlTowerPage = lazy(() => import("./pages/AIControlTowerPage.tsx"));
const TraceConsolePage = lazy(() => import("./pages/TraceConsolePage.tsx"));
const LegalChatbot = lazy(() => import("./components/LegalChatbot.tsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));

const queryClient = new QueryClient();

const MemoryRetentionBootstrap = () => {
  useEffect(() => {
    memory.startRetentionScheduler();
    return () => {
      memory.stopRetentionScheduler();
    };
  }, []);

  return null;
};

const RouteLoadingFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-4">
    <div className="rounded-2xl border border-border bg-card px-6 py-4 text-sm font-medium text-muted-foreground shadow-card">
      กำลังโหลดหน้าระบบ...
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <MemoryRetentionBootstrap />
        <BrowserRouter>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/judgment/:id" element={<JudgmentDetailPage />} />
              <Route path="/government" element={<Navigate to="/clerk-copilot" replace />} />
              <Route path="/government-legacy" element={<GovernmentDashboardLegacy />} />
              <Route path="/judge" element={<Navigate to="/judge-workbench" replace />} />
              <Route path="/judge-legacy" element={<JudgeDashboardLegacy />} />
              <Route path="/citizen" element={<CitizenDashboard />} />
              <Route path="/back-office" element={<BackOfficeHubPage />} />
              <Route path="/clerk-copilot" element={<ClerkCopilotPage />} />
              <Route path="/judge-workbench" element={<JudgeWorkbenchPage />} />
              <Route path="/ai-control-tower" element={<AIControlTowerPage />} />
              <Route path="/trace-console" element={<TraceConsolePage />} />
              <Route path="/complaint-form" element={<ComplaintFormPage />} />
              <Route path="/demo" element={<SystemDemoPage />} />
              <Route path="/simulator" element={<RoleSimulatorPage />} />
              <Route path="/it" element={<Navigate to="/ai-control-tower" replace />} />
              <Route path="/it-legacy" element={<ITDashboardLegacy />} />
              <Route path="/benchmark" element={<NitiBenchPage />} />
              <Route path="/predict" element={<PredictPage />} />
              <Route path="/glossary" element={<GlossaryPage />} />
              <Route path="/prompts" element={<PromptsPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/courts" element={<CourtsPage />} />
              <Route path="/responsible-ai" element={<ResponsibleAIPage />} />
              <Route path="/trust-center" element={<TrustCenterPage />} />
              <Route path="/analyze" element={<AnalyzeCasePage />} />
              <Route path="/private-offering" element={<PrivateOfferingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <Suspense fallback={null}>
            <LegalChatbot />
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
