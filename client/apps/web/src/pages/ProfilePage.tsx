import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Loader2, Award, ShieldCheck, MapPin, User as UserIcon, CheckCircle2, ThumbsUp, ThumbsDown, FileText, Bell, BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'votes'>('reports');
  const [dailyDigestEnabled, setDailyDigestEnabled] = useState(false);
  const [updatingDigest, setUpdatingDigest] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    async function loadProfile() {
      if (!user?.id) return;
      try {
        const data = await api.users.get(user.id);
        setProfile(data);
        if (data.user && 'wantsDailyDigest' in data.user) {
          setDailyDigestEnabled(data.user.wantsDailyDigest);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!profile?.user) {
    return <div className="text-center py-12 text-muted-foreground">Profile not found.</div>;
  }

  const { reports, votes } = profile.user;
  const { trustScore, stats } = profile;

  const handleToggleDigest = async () => {
    if (!user?.id) return;
    const newState = !dailyDigestEnabled;
    setDailyDigestEnabled(newState);
    setUpdatingDigest(true);
    
    try {
      await api.users.updatePreferences(user.id, { wantsDailyDigest: newState });
      toast.success(newState ? "Daily Digest Enabled" : "Daily Digest Disabled", {
        description: newState ? "You will receive a 9 AM summary email." : "We've paused your automated morning digest.",
      });
    } catch (err) {
      setDailyDigestEnabled(!newState); // revert optimistic update
      toast.error("Failed to update preference.");
    } finally {
      setUpdatingDigest(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-primary" /> {profile.user.name}
          </h2>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> {profile.user.zone}, {profile.user.city}
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex items-center gap-3 w-fit">
          <div className="bg-background p-2 rounded-md shadow-sm">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">Trust Score</div>
            <div className="text-xl font-bold text-foreground leading-none">{trustScore} XP</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <FileText className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats?.incidentsReported || 0}</div>
            <div className="text-xs text-muted-foreground">Reported</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <ShieldCheck className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats?.noOfVotes || 0}</div>
            <div className="text-xs text-muted-foreground">Votes Cast</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-5 h-5 text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{stats?.verifications || 0}</div>
            <div className="text-xs text-muted-foreground">Verifications</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border overflow-hidden mb-6">
        <CardHeader className="pb-3 bg-muted/30 border-b border-border/50">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground text-sm">Automated Daily Digest</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Receive a compiled 9 AM summary of all verified incidents in {profile.user.zone}.</p>
            </div>
            <button 
              onClick={handleToggleDigest} 
              disabled={updatingDigest}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${dailyDigestEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              role="switch" 
              aria-checked={dailyDigestEnabled}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${dailyDigestEnabled ? 'translate-x-5' : 'translate-x-0'}`}>
                {dailyDigestEnabled ? <Bell className="w-3 h-3 text-primary" /> : <BellOff className="w-3 h-3 text-muted-foreground" />}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card border border-border p-1 rounded-lg flex gap-1 sticky top-16 z-10 shadow-sm">
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'reports' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
        >
          My Reports
        </button>
        <button 
          onClick={() => setActiveTab('votes')} 
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'votes' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
        >
          My Votes
        </button>
      </div>

      <div className="grid gap-3 pb-8">
        {activeTab === 'reports' && reports?.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">You haven't submitted any reports yet.</div>
        )}
        
        {activeTab === 'reports' && reports?.map((r: any) => (
          <Card key={r.id} className="cursor-pointer hover:border-primary/50 transition-colors bg-card" onClick={() => navigate(`/report/${r.id}`)}>
            <CardContent className="p-4">
              <div className="flex gap-2 mb-2">
                {r.isVerified && <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>}
                <Badge variant="outline" className="text-xs font-normal">{r.category || 'Pending'}</Badge>
              </div>
              <p className="text-sm font-medium line-clamp-2">{r.rawText}</p>
              <div className="mt-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}

        {activeTab === 'votes' && votes?.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">You haven't voted on any incidents yet.</div>
        )}

        {activeTab === 'votes' && votes?.map((v: any) => (
          <Card key={v.id} className="cursor-pointer hover:border-primary/50 transition-colors bg-card" onClick={() => navigate(`/report/${v.reportId}`)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={v.voteType === 'verified' ? 'default' : 'destructive'} className="flex items-center gap-1">
                  {v.voteType === 'verified' ? <ThumbsUp className="w-3 h-3" /> : <ThumbsDown className="w-3 h-3" />}
                  {v.voteType === 'verified' ? 'Valid' : 'Noise'}
                </Badge>
                <div className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</div>
              </div>
              <p className="text-sm font-medium line-clamp-2 italic border-l-2 border-primary/30 pl-3">"{v.report?.rawText}"</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
