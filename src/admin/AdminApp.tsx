import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Compass,
  MapPin,
  Globe2,
  Plane,
  Tag,
  Image as ImageIcon,
  FileText,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Lock,
} from "lucide-react";
import { adminFetch } from "./api.ts";
import { OverviewModule } from "./modules/OverviewModule.tsx";
import { ToursModule } from "./modules/ToursModule.tsx";
import { DestinationsModule } from "./modules/DestinationsModule.tsx";
import { CountriesCitiesModule } from "./modules/CountriesCitiesModule.tsx";
import { FlightsModule } from "./modules/FlightsModule.tsx";
import { PricingPromotionsModule } from "./modules/PricingPromotionsModule.tsx";
import { MediaModule } from "./modules/MediaModule.tsx";
import { SiteContentModule } from "./modules/SiteContentModule.tsx";

type AdminTab =
  "overview" | "tours" | "destinations" | "locations" | "flights" | "pricing" | "media" | "content";

const NAV_ITEMS: Array<{
  id: AdminTab;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Dashboard Overview", group: "Operations", icon: LayoutDashboard },
  { id: "tours", label: "Tours Catalog", group: "Catalog", icon: Compass },
  { id: "destinations", label: "Destinations & Maps", group: "Catalog", icon: MapPin },
  { id: "locations", label: "Countries & Cities", group: "Catalog", icon: Globe2 },
  { id: "flights", label: "Flight Routes", group: "Catalog", icon: Plane },
  { id: "pricing", label: "Pricing & Promotions", group: "Revenue", icon: Tag },
  { id: "media", label: "Media Library", group: "Assets & CMS", icon: ImageIcon },
  { id: "content", label: "Website Content & SEO", group: "Assets & CMS", icon: FileText },
];

export const AdminApp: React.FC = () => {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("karlotabidze@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener("gmp-quota-exceeded", onQuotaExceeded);
    return () => window.removeEventListener("gmp-quota-exceeded", onQuotaExceeded);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Not signed in");
        return response.json() as Promise<{ uid: string; email: string }>;
      })
      .then((session) => {
        if (cancelled) return;
        setUser({ uid: session.uid, email: session.email });
        setIsAuthorizedAdmin(true);
      })
      .catch(() => {
        if (!cancelled) { setUser(null); setIsAuthorizedAdmin(null); }
      })
      .finally(() => { if (!cancelled) setAuthReady(true); });
    return () => { cancelled = true; };
  }, []);

  const handlePasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSigningIn(true);
    setAuthError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; email?: string; uid?: string };
      if (!response.ok) throw new Error(result.error || "Login failed.");
      setUser({ uid: result.uid || loginEmail.toLowerCase(), email: result.email || loginEmail });
      setIsAuthorizedAdmin(true);
      setLoginPassword("");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed.");
    } finally { setSigningIn(false); }
  };

  const handleSignOut = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
    setIsAuthorizedAdmin(null);
  };

  const handleNavigate = (tabKey: string) => {
    const found = NAV_ITEMS.find((n) => n.id === tabKey);
    if (found) {
      setActiveTab(found.id);
      setMobileNavOpen(false);
    }
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0]!;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{" "}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{" "}
            for instructions to update your account.
          </span>
        </div>
      )}

      {!authReady || (user && isAuthorizedAdmin === null) ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-sm text-slate-500">Verifying administrator privileges...</div>
        </div>
      ) : !user ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#173c35] text-[#e4c28e] font-bold flex items-center justify-center text-lg">
                  S
                </div>
                <div>
                  <div className="text-sm font-bold tracking-wider text-slate-900">SAQO TRAVEL</div>
                  <div className="text-xs text-slate-500">Administration Console</div>
                </div>
              </div>
              <Lock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-semibold text-slate-900">
                Sign in to manage marketplace
              </h1>
              <p className="text-sm text-slate-600">
                Sign in with your administrator credentials to manage tours,
                destinations, flight routes, pricing, media, and website content.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </div>
            )}

            <form onSubmit={(event) => void handlePasswordSignIn(event)} className="space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                Administrator email
                <input type="email" autoComplete="username" required value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-800" />
              </label>
              <label className="block text-xs font-medium text-slate-700">
                Admin password
                <input type="password" autoComplete="current-password" required value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-800" />
              </label>
              <button type="submit" disabled={signingIn}
                className="w-full py-2.5 px-4 bg-[#173c35] hover:bg-[#1e4d44] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer">
                {signingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Protected Admin Route</span>
              <a
                href="/"
                className="text-emerald-900 font-medium hover:underline inline-flex items-center gap-1"
              >
                Return to Public Site
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ) : !isAuthorizedAdmin ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-white border border-red-200 rounded-xl p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-red-700">
                Administrator Access Restricted
              </div>
              <Lock className="w-4 h-4 text-red-600" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-slate-900">Administrator Account Not Authorized</h1>
              <p className="text-sm text-slate-600">
                Signed in as <strong className="text-slate-900">{user.email}</strong>, which is not
                listed as an authorized SaqoTravel administrator.
              </p>
              {authError && <p className="text-xs text-red-700 pt-1">{authError}</p>}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Sign Out & Switch Account
              </button>
              <a
                href="/"
                className="py-2.5 px-4 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg text-center"
              >
                Public Website
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200">
            <div className="h-14 px-5 border-b border-slate-200 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#173c35] text-[#e4c28e] font-bold flex items-center justify-center text-xs">
                S
              </div>
              <div>
                <div className="text-xs font-bold tracking-wider text-slate-900">SAQO TRAVEL</div>
                <div className="text-[11px] text-slate-500">Admin Console</div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
              {["Operations", "Catalog", "Revenue", "Assets & CMS"].map((group) => {
                const groupItems = NAV_ITEMS.filter((item) => item.group === group);
                return (
                  <div key={group} className="space-y-1">
                    <div className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {group}
                    </div>
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(item.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                            isActive
                              ? "bg-emerald-950/8 text-emerald-950 font-semibold"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-emerald-900" : "text-slate-400"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            <div className="p-3.5 border-t border-slate-200 space-y-2">
              <div className="px-2">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {"Administrator"}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-md flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </aside>

          {/* Mobile Drawer */}
          {mobileNavOpen && (
            <div className="fixed inset-0 z-40 lg:hidden bg-slate-950/40 flex">
              <div className="w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-slate-200 shadow-xl">
                <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-slate-900">
                    SAQO TRAVEL ADMIN
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="p-1.5 text-slate-500 hover:text-slate-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavigate(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium ${
                          isActive
                            ? "bg-emerald-950/8 text-emerald-950 font-semibold"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className="p-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="w-full py-2 px-3 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out ({user.email})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Workspace */}
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation"
                  className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="text-xs sm:text-sm text-slate-500 truncate">
                  <span className="hidden sm:inline">{activeNavMeta.group} / </span>
                  <strong className="font-semibold text-slate-900">{activeNavMeta.label}</strong>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  View Public Website
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
              {activeTab === "overview" && <OverviewModule onNavigate={handleNavigate} />}
              {activeTab === "tours" && <ToursModule />}
              {activeTab === "destinations" && <DestinationsModule />}
              {activeTab === "locations" && <CountriesCitiesModule />}
              {activeTab === "flights" && <FlightsModule />}
              {activeTab === "pricing" && <PricingPromotionsModule />}
              {activeTab === "media" && <MediaModule />}
              {activeTab === "content" && <SiteContentModule />}
            </main>
          </div>
        </div>
      )}
    </div>
  );
};
