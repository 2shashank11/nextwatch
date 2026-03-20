import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Card, CardContent } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Loader2, Users, Settings, ShieldCheck, AlertTriangle, LifeBuoy, MapPin, Clock, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function CirclePage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [myMessage, setMyMessage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'SAFE' | 'ALERT' | 'NEED_HELP' | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  
  const fetchFeed = async () => {
    if (!user) return;
    try {
      const data = await api.circles.getFeed();
      setFeed(data.feed || []);
      
      // Also fetch personal circleStatus from profile payload cache
      const profileData = await api.users.get(user.id);
      if (profileData?.user?.circleStatus) {
        setMyStatus(profileData.user.circleStatus.status);
        setMyMessage(profileData.user.circleStatus.message || null);
      }
    } catch (err) {
      console.error("Failed to load circle feed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  const handleSetStatus = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status first");
      return;
    }
    if (selectedStatus === 'NEED_HELP' && !window.confirm("This will alert your Safe Circle that you need immediate checking on. Proceed?")) {
      return;
    }
    
    setUpdating(true);
    try {
      await api.circles.setStatus({ status: selectedStatus, message: draftMessage.trim() || undefined });
      toast.success("Status Updated Successfully", { description: "Your Safe Circle can now see your status." });
      setMyStatus(selectedStatus);
      setMyMessage(draftMessage.trim() || null);
      setSelectedStatus(null);
      setDraftMessage('');
      fetchFeed();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const StatusBadge = ({ status }: { status: string | null }) => {
    if (status === 'SAFE') return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none"><ShieldCheck className="w-3 h-3 mr-1"/> Safe</Badge>;
    if (status === 'ALERT') return <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-amber-950"><AlertTriangle className="w-3 h-3 mr-1"/> Alert</Badge>;
    if (status === 'NEED_HELP') return <Badge className="bg-red-500 hover:bg-red-600 border-none"><LifeBuoy className="w-3 h-3 mr-1"/> Need Help</Badge>;
    return <Badge variant="secondary" className="text-muted-foreground bg-muted">No Update</Badge>;
  };

  if (loading && !feed.length) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> My Circle
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Private safety feed for your trusted network.
          </p>
        </div>
        <Link to="/circle/settings">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="w-4 h-4" /> Manage
          </Button>
        </Link>
      </div>

      <Card className="bg-card shadow-sm border-border mb-6">
        <CardContent className="p-4 grid gap-4">
          {myStatus ? (
            <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-md border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">My Current Status</span>
                <StatusBadge status={myStatus} />
              </div>
              {myMessage && (
                <p className="text-sm italic text-foreground mt-1">"{myMessage}"</p>
              )}
            </div>
          ) : (
            <div className="text-sm font-semibold text-muted-foreground">Update your safety status</div>
          )}

          <div className="flex flex-col gap-3 mt-1">
            <input 
              type="text" 
              placeholder="Draft optional message..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              disabled={updating}
              maxLength={100}
            />
            
            <div className="flex items-center gap-2">
              <div className="flex gap-2 flex-1">
                <Button 
                  variant={selectedStatus === 'SAFE' ? 'default' : 'outline'} 
                  size="sm"
                  className={`flex-1 h-9 px-0 ${selectedStatus === 'SAFE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' : 'hover:border-emerald-500 hover:text-emerald-600'}`}
                  onClick={() => setSelectedStatus('SAFE')}
                  disabled={updating}
                >
                  <ShieldCheck className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Safe</span>
                </Button>
                <Button 
                  variant={selectedStatus === 'ALERT' ? 'default' : 'outline'} 
                  size="sm"
                  className={`flex-1 h-9 px-0 ${selectedStatus === 'ALERT' ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' : 'hover:border-amber-500 hover:text-amber-600'}`}
                  onClick={() => setSelectedStatus('ALERT')}
                  disabled={updating}
                >
                  <AlertTriangle className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Alert</span>
                </Button>
                <Button 
                  variant={selectedStatus === 'NEED_HELP' ? 'default' : 'outline'} 
                  size="sm"
                  className={`flex-1 h-9 px-0 ${selectedStatus === 'NEED_HELP' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'hover:border-red-500 hover:text-red-600'}`}
                  onClick={() => setSelectedStatus('NEED_HELP')}
                  disabled={updating}
                >
                  <LifeBuoy className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Help</span>
                </Button>
              </div>
              <Button 
                size="sm"
                onClick={handleSetStatus} 
                disabled={updating || !selectedStatus}
                className="px-3 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {feed.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <Users className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-sm font-medium">Your Safe Circle is currently empty.</p>
              <p className="text-xs mt-1">Add up to 5 trusted friends to monitor each other's safety limits privately.</p>
              <Link to="/circle/settings">
                <Button variant="secondary" className="mt-4" size="sm">Add Members</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          feed.map(member => (
            <Card key={member.id} className="bg-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-md flex items-center gap-2">
                    {member.name}
                  </h4>
                  {member.message && (
                    <p className="text-sm italic text-muted-foreground mt-0.5 max-w-[200px] sm:max-w-[300px] truncate">
                      "{member.message}"
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-3 h-3" /> {member.zone}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={member.status} />
                  {member.updatedAt && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> 
                      {new Date(member.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}
