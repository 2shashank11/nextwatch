import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { DigestCard } from './DigestCard';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Loader2, ShieldCheck, MapPin, Search, Globe, AlertTriangle } from 'lucide-react';

export function DigestFeed() {
  const { user, updateUser } = useAuth();
  const [digests, setDigests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'zone' | 'city' | 'search'>('zone');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [myStatus, setMyStatus] = useState<string | null>(user?.circleStatus?.status || null);
  const [myMessage, setMyMessage] = useState<string>(user?.circleStatus?.message || '');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showHelpInput, setShowHelpInput] = useState(false);

  const fetchDigests = async () => {
    setLoading(true);
    try {
      let query: any = {};
      if (activeTab === 'zone') {
        query.zone = user?.zone;
      } else if (activeTab === 'city') {
        query.city = user?.city;
      } else if (activeTab === 'search' && activeSearch) {
        query.search = activeSearch;
      }
      
      const data = await api.digests.list(query);
      setDigests(data.digests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'search' || activeSearch) {
      fetchDigests();
    } else {
      setDigests([]);
      setLoading(false);
    }
    
    // Sync with user status from context on load
    if (user?.circleStatus) {
      setMyStatus(user.circleStatus.status);
      setMyMessage(user.circleStatus.message || '');
    }
  }, [activeTab, activeSearch, user?.zone, user?.city, user?.id, user?.circleStatus]);

  const handleSetStatus = async (status: 'SAFE' | 'ALERT' | 'NEED_HELP', message?: string) => {
    setUpdatingStatus(true);
    try {
      await api.circles.setStatus({ status, message });
      setMyStatus(status);
      if (message) setMyMessage(message);
      setBannerDismissed(true);
      setShowHelpInput(false);
      
      // Update global context
      updateUser({ 
        circleStatus: { 
          status, 
          message: message || '', 
          updatedAt: new Date().toISOString() 
        } 
      });
    } catch {
      // ignore
    } finally {
      setUpdatingStatus(false);
    }
  };

  const hasCritical = digests.some(d => d.severity === 'CRITICAL');
  const showBanner = hasCritical && activeTab === 'zone' && (myStatus === null || myStatus === 'SAFE') && !bannerDismissed;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Community Feed</h2>
          <p className="text-muted-foreground text-sm mt-1">Verified safe alerts for your area.</p>
        </div>
      </div>

      <div className="bg-card border border-border p-1 rounded-lg flex flex-wrap gap-1">
        <button 
          onClick={() => setActiveTab('zone')} 
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'zone' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <MapPin className="w-4 h-4" /> My Zone
        </button>
        <button 
          onClick={() => setActiveTab('city')} 
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'city' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Globe className="w-4 h-4" /> My City
        </button>
        <button 
          onClick={() => setActiveTab('search')} 
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'search' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Search className="w-4 h-4" /> Search
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="flex gap-2">
          <Input 
            placeholder="Type any zone name, city, or keyword..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveSearch(searchQuery)}
            className="bg-card"
          />
          <Button onClick={() => setActiveSearch(searchQuery)}><Search className="w-4 h-4" /></Button>
        </div>
      )}

      {showBanner && (
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 shadow-md mb-6 animate-in slide-in-from-top-4 relative">
          <Button variant="ghost" className="absolute top-2 right-2 h-6 w-6 p-0 text-red-500 hover:bg-red-100" onClick={() => setBannerDismissed(true)}>✕</Button>
          <CardContent className="p-4 sm:flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800 dark:text-red-300">A critical alert is active in your area.</h4>
                <p className="text-sm text-red-700/90 dark:text-red-400 mt-0.5">Let your Safe Circle know you're okay.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-3 sm:mt-0 shrink-0 min-w-[120px]">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={updatingStatus} onClick={() => handleSetStatus('SAFE')} className="flex-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-emerald-50/50">I'm Safe</Button>
                <Button size="sm" variant="outline" disabled={updatingStatus} onClick={() => handleSetStatus('ALERT')} className="flex-1 border-amber-500 text-amber-800 hover:bg-amber-50 hover:text-amber-900 bg-amber-50/50">I'm Alert</Button>
              </div>
              <Button size="sm" variant="destructive" disabled={updatingStatus} onClick={() => setShowHelpInput(!showHelpInput)} className="w-full bg-red-600 hover:bg-red-700">Need Help</Button>
            </div>
          </CardContent>
          {showHelpInput && (
            <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2">
              <div className="flex gap-2">
                <Input 
                  placeholder="Type a quick message for your Circle (e.g. 'I'm stuck at the station')" 
                  value={myMessage}
                  onChange={(e) => setMyMessage(e.target.value)}
                  className="bg-white border-red-200"
                />
                <Button variant="destructive" size="sm" onClick={() => handleSetStatus('NEED_HELP', myMessage)} disabled={updatingStatus}>Send Help Alert</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : digests.length === 0 ? (
        <div className="text-center py-16 px-4 border-2 border-dashed border-border rounded-xl bg-card">
          <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-sm">
            {activeTab === 'search' && !activeSearch ? <Search className="w-6 h-6 text-primary" /> : <ShieldCheck className="w-6 h-6 text-primary" />}
          </div>
          <h3 className="text-lg font-medium text-foreground">
            {activeTab === 'search' && !activeSearch ? 'Search communities & alerts' : 'All clear'}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
            {activeTab === 'search' && !activeSearch 
              ? 'Enter a zone, city, or keyword above to see localized incidents.'
              : 'No critical safety incidents reported in this scope recently. Enjoy your day!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {digests.map(d => <DigestCard key={d.id} digest={d} />)}
        </div>
      )}
    </div>
  );
}
