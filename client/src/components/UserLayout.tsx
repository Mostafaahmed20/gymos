import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Activity,
  Bell,
  Dumbbell,
  Globe,
  Home,
  LogOut,
  Menu,
  ShoppingBag,
  TrendingUp,
  User,
  X,
  Calendar,
  ChevronRight,
  Salad,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

interface UserLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function UserLayout({ children, title }: UserLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, language, setLanguage, isRTL } = useLanguage();
  const notificationsQuery = trpc.notifications.list.useQuery({ isRead: false, limit: 10 });
  const unreadCount = notificationsQuery.data?.length ?? 0;

  const navItems = [
    { path: "/dashboard", label: t.nav.dashboard, icon: Home },
    { path: "/profile", label: t.nav.myProfile, icon: User },
    { path: "/workout", label: t.nav.workout, icon: Dumbbell },
    { path: "/progress", label: t.nav.progress, icon: TrendingUp },
    { path: "/attendance", label: t.nav.myAttendance, icon: Calendar },
    { path: "/nutrition", label: t.nav.nutrition, icon: Salad },
    { path: "/store", label: t.nav.store, icon: ShoppingBag },
    { path: "/notifications", label: t.nav.myNotifications, icon: Bell },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl font-black text-primary">GYMOS</div>
          <p className="text-muted-foreground">{t.nav.userPortal}</p>
          <Button asChild>
            <a href={getLoginUrl()}>{t.common.signIn}</a>
          </Button>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-black text-xl text-foreground tracking-tight">GYMOS</div>
            <div className="text-xs text-muted-foreground">{t.nav.userPortal}</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.path === "/notifications" && unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
              {isActive && item.path !== "/notifications" && (
                <ChevronRight className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          <Globe className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-start">{language === "en" ? "العربية" : "English"}</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{user?.name ?? "Member"}</div>
            <div className="text-xs text-muted-foreground">{t.common.active}</div>
          </div>
        </div>
        {user?.role === "admin" && (
          <Button asChild variant="outline" size="sm" className="w-full mb-2">
            <Link href="/admin">{t.nav.adminPanel}</Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
          <LogOut className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} />
          {t.common.signOut}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-background overflow-hidden ${isRTL ? "flex-row-reverse" : ""}`}>
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className={`absolute flex flex-col w-64 h-full bg-sidebar border-sidebar-border ${isRTL ? "right-0 border-l" : "left-0 border-r"}`}>
            <Button variant="ghost" size="icon" className={`absolute top-4 z-10 ${isRTL ? "left-4" : "right-4"}`} onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">
            {/* Language Toggle - large prominent button */}
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-primary bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all text-sm font-bold shadow-[0_0_12px_rgba(249,115,22,0.3)] hover:shadow-[0_0_20px_rgba(249,115,22,0.5)]"
            >
              <Globe className="w-4 h-4" />
              <span className="tracking-wide">{language === "en" ? "العربية" : "English"}</span>
            </button>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
