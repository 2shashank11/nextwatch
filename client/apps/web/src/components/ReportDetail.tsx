import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@workspace/ui/components/card';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { ThumbsUp, ThumbsDown, Loader2, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export function ReportDetail() {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIONABLE' | 'AMBIGUOUS' | 'VENTING'>('ACTIONABLE');
  const [page, setPage] = useState(1);
  const limit = 5;
  const navigate = useNavigate();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.reports.list({ limit, offset: (page - 1) * limit, noiseLabel: activeTab });
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, page]);

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Verify Reports</h2>
        <p className="text-muted-foreground text-sm mt-1">Review raw community submissions to build truth.</p>
      </div>

      <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
        {['ACTIONABLE', 'AMBIGUOUS', 'VENTING'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab as any); setPage(1); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center border rounded-xl border-dashed">
          <p className="text-muted-foreground">No records found for this category.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reports.map((r: any) => {
            const upvotes = r.votes?.filter((v: any) => v.voteType === 'verified').length || 0;
            const downvotes = r.votes?.filter((v: any) => v.voteType === 'not_verified').length || 0;
            const duplicateCount = r.duplicates?.length || 0;
            const isClustered = duplicateCount > 0;

            return (
              <div key={r.id} className="relative group">
                {isClustered && (
                  <>
                    <div className="absolute top-2 left-2 right-[-8px] bottom-[-8px] bg-muted/60 rounded-xl border border-muted -z-20 transition-all group-hover:translate-x-1 group-hover:translate-y-1" />
                    <div className="absolute top-1 left-1 right-[-4px] bottom-[-4px] bg-muted/80 rounded-xl border border-muted -z-10 transition-all group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
                  </>
                )}
                <Card 
                  className={`cursor-pointer hover:border-primary/50 transition-colors bg-card border-border shadow-sm relative z-0 ${isClustered ? 'border-primary/20' : ''}`} 
                  onClick={() => navigate(`/report/${r.id}`)}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2 flex-wrap items-center">
                        {r.isVerified && <Badge variant="default" className="bg-green-600/10 text-green-700 hover:bg-green-600/20 border-green-600/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>}
                        {isClustered && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                            Cluster ({duplicateCount + 1} reports)
                          </Badge>
                        )}
                        <Badge variant={r.noiseLabel === 'ACTIONABLE' ? 'default' : 'secondary'} className="text-xs">{r.noiseLabel}</Badge>
                        {r.category && <Badge variant="outline" className="text-xs font-normal bg-background">{r.category}</Badge>}
                        
                        <div className="ml-auto flex items-center gap-2 text-xs font-medium">
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${r.currentUserVote === 'verified' ? 'text-green-700 bg-green-500/30 ring-1 ring-green-600/50' : 'text-green-600/80 bg-green-500/10'}`}>
                            <ThumbsUp className="w-3 h-3" /> {upvotes}
                          </span>
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${r.currentUserVote === 'not_verified' ? 'text-destructive bg-destructive/30 ring-1 ring-destructive/50' : 'text-destructive/80 bg-destructive/10'}`}>
                            <ThumbsDown className="w-3 h-3" /> {downvotes}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">{r.rawText}</p>
                      
                      <div className="mt-3 flex items-center text-xs text-muted-foreground gap-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(r.createdAt).toLocaleTimeString()}</span>
                        <span className="flex items-center gap-1 truncate max-w-[200px]" title={`${r.zone}, ${r.city}`}>
                          <span className="font-medium">{r.zone}</span> 
                          <span className="text-muted-foreground/50">•</span> 
                          {r.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground/50">•</span>
                          {r.isAnonymous || !r.user ? (
                            <span className="italic">Anonymous</span>
                          ) : (
                            <span className="font-medium text-foreground flex items-center">{r.user.name} <Badge variant="secondary" className="ml-1 h-4 px-1 py-0 text-[10px] bg-primary/10 text-primary border-primary/20">★ {r.user.trustScore}</Badge></span>
                          )}
                        </span>
                      </div>
                      
                      {isClustered && r.duplicates && r.duplicates.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Similar Reports ({duplicateCount})</p>
                          <div className="space-y-2">
                            {r.duplicates.map((dup: any) => (
                              <div key={dup.id} className="bg-muted/40 p-3 rounded-md border border-border/50 hover:bg-muted/60 transition-colors">
                                <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed mb-2">{dup.rawText}</p>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(dup.createdAt).toLocaleTimeString()}</span>
                                  <span className="truncate max-w-[120px]">{dup.zone}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function ReportDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) return null;
  return <ReportDetailView reportId={id} onBack={() => navigate(-1)} />;
}

import { useAuth } from '../contexts/AuthContext';

function ReportDetailView({ reportId, onBack }: { reportId: string, onBack: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState<string>('');
  const [overrideSeverity, setOverrideSeverity] = useState<string>('');

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await api.reports.get(reportId);
      setData(res);
      setOverrideCategory(res.report.category || '');
      setOverrideSeverity(res.report.severity || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const handleVote = async (type: 'verified' | 'not_verified') => {
    setVoting(true);
    try {
      await api.reports.vote(reportId, type);
      await loadReport();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || 'Vote failed. You may have already voted.');
    } finally {
      setVoting(false);
    }
  };

  if (loading || !data) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const { report, voteCount, duplicateCount } = data;
  const isOwner = user?.id === report.userId;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground mb-2 -ml-2">
        ← Back to list
      </Button>

      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-mono flex gap-2 items-center">
              ID: {report.id.substring(0,8)}... 
              <span className="text-muted-foreground/30">|</span> 
              {new Date(report.createdAt).toLocaleString()}
              <span className="text-muted-foreground/30">|</span>
              {report.isAnonymous || !report.user ? (
                <span className="italic font-sans">Anonymous</span>
              ) : (
                <span className="font-medium font-sans text-foreground flex items-center">{report.user.name} <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 py-0 text-[11px] bg-primary/10 text-primary border-primary/20">★ {report.user.trustScore}</Badge></span>
              )}
            </div>
            <CardTitle className="text-xl leading-relaxed text-foreground">{report.rawText}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant={report.usedFallback ? "outline" : "default"}>
              {report.usedFallback ? "Fallback Applied" : "AI Processed"}
            </Badge>
            {report.isVerified && <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified Incident</Badge>}
            <Badge variant="secondary">Clusters: {duplicateCount + 1}</Badge>
          </div>

          <div className="p-4 bg-muted/20 rounded-lg border border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">Community Validation</h4>
            <div className="flex items-center gap-4">
              <Button 
                variant={data.currentUserVote === 'verified' ? "default" : "outline"} 
                className={`flex-1 gap-2 ${data.currentUserVote === 'verified' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-primary/10 text-primary hover:text-primary'}`}
                onClick={() => handleVote('verified')}
                disabled={voting}
              >
                <ThumbsUp className="w-4 h-4" />
                Valid ({voteCount.verified})
              </Button>
              <Button 
                variant={data.currentUserVote === 'not_verified' ? "default" : "outline"} 
                className={`flex-1 gap-2 ${data.currentUserVote === 'not_verified' ? 'bg-destructive hover:bg-destructive/90 text-white' : 'border-destructive/20 hover:bg-destructive/10 text-destructive hover:text-destructive'}`}
                onClick={() => handleVote('not_verified')}
                disabled={voting}
              >
                <ThumbsDown className="w-4 h-4" />
                Noise ({voteCount.notVerified})
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Requires 5 votes to process trust score rewards. Penalty at 10 noise votes.
            </p>
          </div>

          {isOwner && (
            <div className="border-t border-border pt-5">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                <AlertCircle className="w-4 h-4 text-primary" />
                Categorisation Override
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Select value={overrideCategory} onValueChange={setOverrideCategory}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phishing">Phishing</SelectItem>
                      <SelectItem value="violence">Violence</SelectItem>
                      <SelectItem value="theft">Theft</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="natural_hazard">Natural Hazard</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      {/* <SelectItem value="Others">Others</SelectItem> */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Severity</label>
                  <Select value={overrideSeverity} onValueChange={setOverrideSeverity}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => toast.success('Override saved (mock)')}>Save Override</Button>
              </div>
            </div>
          )}

          {report.duplicates && report.duplicates.length > 0 && (
            <div className="border-t border-border pt-5">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
                <AlertCircle className="w-4 h-4 text-primary" />
                Clustered Similar Reports ({duplicateCount})
              </h4>
              <div className="space-y-3">
                {report.duplicates.map((dup: any) => (
                  <div key={dup.id} className="bg-muted/30 p-4 rounded-lg border border-border/50">
                    <p className="text-sm font-medium text-foreground mb-2 leading-relaxed">{dup.rawText}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(dup.createdAt).toLocaleString()}</span>
                        {dup.isAnonymous || !dup.user ? (
                          <span className="italic text-[10px]">Anonymous</span>
                        ) : (
                          <span className="font-medium text-foreground text-[10px] flex items-center">
                            {dup.user.name} 
                            <Badge variant="secondary" className="ml-1 h-3.5 px-1 py-0 text-[8px] bg-primary/10 text-primary border-primary/20">
                              ★ {dup.user.trustScore}
                            </Badge>
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{dup.zone}</span>
                        {dup.city ? <><span className="text-muted-foreground/50">•</span> {dup.city}</> : null}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
