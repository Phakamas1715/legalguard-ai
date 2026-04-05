import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import BookmarksPage from "./pages/BookmarksPage.tsx";
import HistoryPage from "./pages/HistoryPage.tsx";
import JudgmentDetailPage from "./pages/JudgmentDetailPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import GovernmentDashboard from "./pages/GovernmentDashboard.tsx";
import ComplaintFormPage from "./pages/ComplaintFormPage.tsx";
import CitizenDashboard from "./pages/CitizenDashboard.tsx";
import LawyerDashboard from "./pages/LawyerDashboard.tsx";
import SystemDemoPage from "./pages/SystemDemoPage.tsx";
import ITDashboard from "./pages/ITDashboard.tsx";
import NitiBenchPage from "./pages/NitiBenchPage.tsx";
import PredictPage from "./pages/PredictPage.tsx";
import GlossaryPage from "./pages/GlossaryPage.tsx";
import PromptsPage from "./pages/PromptsPage.tsx";
import GraphPage from "./pages/GraphPage.tsx";
import CourtsPage from "./pages/CourtsPage.tsx";
import ResponsibleAIPage from "./pages/ResponsibleAIPage.tsx";
import AnalyzeCasePage from "./pages/AnalyzeCasePage.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import LegalChatbot from "./components/LegalChatbot.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/judgment/:id" element={<JudgmentDetailPage />} />
          <Route path="/government" element={<GovernmentDashboard />} />
          <Route path="/citizen" element={<CitizenDashboard />} />
          <Route path="/lawyer" element={<LawyerDashboard />} />
          <Route path="/complaint-form" element={<ComplaintFormPage />} />
          <Route path="/demo" element={<SystemDemoPage />} />
          <Route path="/it" element={<ITDashboard />} />
          <Route path="/benchmark" element={<NitiBenchPage />} />
          <Route path="/predict" element={<PredictPage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/courts" element={<CourtsPage />} />
          <Route path="/responsible-ai" element={<ResponsibleAIPage />} />
          <Route path="/analyze" element={<AnalyzeCasePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <LegalChatbot />
      </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
