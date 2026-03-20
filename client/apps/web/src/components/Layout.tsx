import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { ShieldAlert, BarChart3, Edit3, ShieldCheck, ListChecks, LogOut, User as UserIcon, Users } from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@workspace/ui/components/button';
import { NetworkHealthWidget } from './NetworkHealthWidget';

export function Layout() {
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNetworkWidgetOpen, setIsNetworkWidgetOpen] = useState(false);
  
  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Nexwatch</h1>
          </Link>
          <div className="flex items-center gap-4 relative">
            {user && (
              <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded font-medium hidden sm:block">
                {user.zone}{user.city && user.city !== "Unknown" ? `, ${user.city}` : ''}
              </div>
            )}
            <ModeToggle />
            {user ? (
              <div className="flex items-center gap-2 relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  title="Profile Menu" 
                  className={`text-primary hover:text-primary/80 hover:bg-primary/10 ${isProfileMenuOpen ? 'bg-primary/10' : ''}`}
                >
                  <UserIcon className="h-4 w-4" />
                </Button>
                
                {isProfileMenuOpen && (
                  <div className="absolute top-12 right-10 w-48 bg-card border border-border shadow-lg rounded-md overflow-hidden flex flex-col z-50 animate-in slide-in-from-top-2">
                    <Link to="/profile" onClick={() => setIsProfileMenuOpen(false)} className="px-4 py-3 text-sm hover:bg-muted text-foreground font-medium flex items-center gap-2">
                      <UserIcon className="w-4 h-4" /> View Profile
                    </Link>
                    <button 
                      onClick={() => {
                        setIsNetworkWidgetOpen(!isNetworkWidgetOpen);
                        setIsProfileMenuOpen(false);
                      }} 
                      className="px-4 py-3 text-sm hover:bg-muted text-left text-foreground font-medium flex items-center gap-2 border-t border-border"
                    >
                      <ShieldCheck className="w-4 h-4" /> Network Check
                    </button>
                  </div>
                )}

                <Button variant="ghost" size="icon" onClick={logout} title="Sign Out">
                   <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">Sign In</Button>
              </Link>
            )}

            {isNetworkWidgetOpen && (
              <div className="absolute top-14 right-0 z-[100] animate-in slide-in-from-top-4">
                <NetworkHealthWidget onClose={() => setIsNetworkWidgetOpen(false)} />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <nav className="bg-card border-t border-border sticky bottom-0 mt-auto">
        <div className="max-w-4xl mx-auto flex">
          <NavLink to="/feed" className={navLinkClass}>
            <ListChecks className="w-5 h-5 mb-0.5" /> Feed
          </NavLink>
          <NavLink to="/report" className={navLinkClass}>
            <Edit3 className="w-5 h-5 mb-0.5" /> Report
          </NavLink>
          <NavLink to="/circle" className={navLinkClass}>
            <Users className="w-5 h-5 mb-0.5" /> Circle
          </NavLink>
          <NavLink to="/trends" className={navLinkClass}>
            <BarChart3 className="w-5 h-5 mb-0.5" /> Trends
          </NavLink>
          <NavLink to="/verify" className={navLinkClass}>
            <ShieldAlert className="w-5 h-5 mb-0.5" /> Verify
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
