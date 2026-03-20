import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@workspace/ui/components/card';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Badge } from '@workspace/ui/components/badge';
import { Loader2, ArrowLeft, Search, UserMinus, Plus, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function CircleSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [membersIds, setMembersIds] = useState<string[]>([]);
  const [membersDetails, setMembersDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function loadMembers() {
      try {
        if (!user?.id) return;
        const u = await api.users.get(user.id);
        const ids = u.user?.safeCircleIds || [];
        setMembersIds(ids);
        
        // Let's resolve the member detail payloads directly from getting their user profiles
        const details = await Promise.all(ids.map((id: string) => api.users.get(id).then(r => r.user).catch(() => null)));
        setMembersDetails(details.filter(Boolean));
      } catch (err) {
        toast.error("Failed to load circle members");
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, [user]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        try {
          const res = await api.circles.search(searchQuery);
          setSearchResults(res.users.filter((su: any) => !membersIds.includes(su.id)));
        } catch {
          // ignore
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery, membersIds]);

  const handleUpdateCircle = async (newIds: string[]) => {
    setUpdating(true);
    try {
      const res = await api.circles.updateMembers(newIds);
      setMembersIds(res.safeCircleIds);
      toast.success("Safe Circle updated");
      
      const details = await Promise.all(res.safeCircleIds.map((id: string) => api.users.get(id).then(r => r.user).catch(() => null)));
      setMembersDetails(details.filter(Boolean));
      setSearchQuery('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to update Safe Circle");
    } finally {
      setUpdating(false);
    }
  };

  const addMember = (id: string) => {
    if (membersIds.length >= 5) {
      toast.error("Maximum 5 members allowed in your Safe Circle");
      return;
    }
    handleUpdateCircle([...membersIds, id]);
  };

  const removeMember = (id: string) => {
    handleUpdateCircle(membersIds.filter(m => m !== id));
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const isFull = membersIds.length >= 5;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/circle')} className="-ml-2">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Circle Settings</h2>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Current Members</span>
            <Badge variant="secondary" className="font-mono">{membersIds.length} / 5</Badge>
          </CardTitle>
          <CardDescription>
            These users will securely receive check-in requests when a CRITICAL alert occurs in your zone, and can monitor your broadcasted safety status privately.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 p-0">
          {membersDetails.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              You haven't added anyone to your Safe Circle yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {membersDetails.map(m => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-foreground text-sm flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary"/> {m.name}</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.zone || 'Unknown Zone'}</p>
                  </div>
                  <Button variant="ghost" size="icon" disabled={updating} onClick={() => removeMember(m.id)} className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Members</CardTitle>
          <CardDescription>Search by full name to extend your trusted network.</CardDescription>
        </CardHeader>
        <CardContent>
          {isFull ? (
             <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50 p-3 rounded-md text-sm font-medium text-center">
               Your circle is full. Remove a member above to add someone new.
             </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search Nexwatch users..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searching && <div className="text-xs text-center text-muted-foreground py-2">Searching...</div>}
              
              {!searching && searchResults.length > 0 && (
                <div className="border border-border rounded-md overflow-hidden bg-background divide-y divide-border">
                  {searchResults.map(u => (
                    <div key={u.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.zone || 'Unknown Zone'}</div>
                      </div>
                      <Button size="sm" variant="secondary" disabled={updating} onClick={() => addMember(u.id)} className="h-7 text-xs gap-1.5">
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
