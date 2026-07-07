import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import FloatingLangToggle from "./components/FloatingLangToggle";
import Home from "./pages/Home";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTrainees from "./pages/admin/Trainees";
import AdminTraineeDetail from "./pages/admin/TraineeDetail";
import AdminTrainers from "./pages/admin/Trainers";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminPayments from "./pages/admin/Payments";
import AdminWorkouts from "./pages/admin/Workouts";
import AdminAttendance from "./pages/admin/Attendance";
import AdminMarketing from "./pages/admin/Marketing";
import AdminNutrition from "./pages/admin/Nutrition";
import AdminNutritionEditor from "./pages/admin/NutritionEditor";
import AdminSupplements from "./pages/admin/Supplements";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";
import AdminExerciseLibrary from "./pages/admin/ExerciseLibrary";
import AdminNotifications from "./pages/admin/Notifications";
import UserDashboard from "./pages/user/Dashboard";
import UserProfile from "./pages/user/Profile";
import UserWorkout from "./pages/user/Workout";
import UserProgress from "./pages/user/Progress";
import UserAttendance from "./pages/user/Attendance";
import UserStore from "./pages/user/Store";
import UserNutrition from "./pages/user/Nutrition";
import UserNotifications from "./pages/user/Notifications";
import SaasLanding from "./pages/saas/Landing";
import SaasPricing from "./pages/saas/Pricing";
import SaasLogin from "./pages/saas/Login";
import SaasDashboard from "./pages/saas/Dashboard";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/trainees" component={AdminTrainees} />
      <Route path="/admin/trainees/:id" component={AdminTraineeDetail} />
      <Route path="/admin/trainers" component={AdminTrainers} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/workouts" component={AdminWorkouts} />
      <Route path="/admin/exercises" component={AdminExerciseLibrary} />
      <Route path="/admin/attendance" component={AdminAttendance} />
      <Route path="/admin/marketing" component={AdminMarketing} />
      <Route path="/admin/nutrition" component={AdminNutrition} />
      <Route path="/admin/nutrition/new" component={AdminNutritionEditor} />
      <Route path="/admin/nutrition/:id/edit" component={AdminNutritionEditor} />
      <Route path="/admin/supplements" component={AdminSupplements} />
      <Route path="/admin/notifications" component={AdminNotifications} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/settings" component={AdminSettings} />
      {/* User Routes */}
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/profile" component={UserProfile} />
      <Route path="/workout" component={UserWorkout} />
      <Route path="/progress" component={UserProgress} />
      <Route path="/attendance" component={UserAttendance} />
      <Route path="/nutrition" component={UserNutrition} />
      <Route path="/store" component={UserStore} />
      <Route path="/notifications" component={UserNotifications} />
      <Route path="/404" component={NotFound} />
      <Route path="/saas" component={SaasLanding} />
      <Route path="/saas/pricing" component={SaasPricing} />
      <Route path="/saas/login" component={SaasLogin} />
      <Route path="/saas/dashboard" component={SaasDashboard} />
      <Route path="/super-admin" component={SuperAdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
          <FloatingLangToggle />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
