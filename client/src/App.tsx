import "./studio.css";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const TestSignupPage = lazy(() => import("./pages/TestSignupPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CityPage = lazy(() => import("./pages/CityPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const InstitutionalPage = lazy(() => import("./pages/InstitutionalPage"));
const DemoProfilePage = lazy(() => import("./pages/DemoProfilePage"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminNewPortfolioPage = lazy(() => import("./pages/AdminNewPortfolioPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/redefinir-senha" component={ResetPasswordPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/cadastro" component={SignupPage} />
      <Route path="/alterar-senha" component={ChangePasswordPage} />
      <Route path="/cadastro-teste" component={TestSignupPage} />
      <Route path="/perfil/:slug" component={ProfilePage} />
      <Route path="/demo/perfil/:slug" component={DemoProfilePage} />
      <Route path="/cidade/:city" component={CityPage} />
      <Route path="/categoria/:category" component={CategoryPage} />
      <Route path="/termos" component={InstitutionalPage} />
      <Route path="/privacidade" component={InstitutionalPage} />
      <Route path="/seguranca" component={InstitutionalPage} />
      <Route path="/denuncia" component={InstitutionalPage} />
      <Route path="/ajuda" component={InstitutionalPage} />
      <Route path="/contato" component={InstitutionalPage} />
      <Route path="/titular" component={OwnerDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/portfolio/novo" component={AdminNewPortfolioPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<div className="studio"><main className="studio-main"><p>Carregando…</p></main></div>}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
