import { ChevronDown, ShieldAlert, AlertTriangle, Shield, Info, ArrowRight, FileText } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@workspace/ui/components/card';
import { useState } from 'react';
import { Link } from 'react-router-dom';

type LinkedReport = {
  id: string;
  rawText: string;
  category: string | null;
  severity: string | null;
  zone: string;
  createdAt: string;
  confirmationCount: number;
};

type Digest = {
  id: string;
  zone: string;
  content: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  actionSteps: string[];
  triggeredAt: string;
  usedFallback: boolean;
  reportId?: string;
  report?: LinkedReport;
};

export function DigestCard({ digest }: { digest: Digest }) {
  const [expanded, setExpanded] = useState(false);

  // Severity variant mapping for Shadcn UI Badge
  const severityVariants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
    CRITICAL: "destructive",
    HIGH: "default",
    MEDIUM: "secondary",
    LOW: "outline"
  };

  const SeverityIcon = {
    CRITICAL: ShieldAlert,
    HIGH: AlertTriangle,
    MEDIUM: Shield,
    LOW: Info
  }[digest.severity] || Info;

  const Icon = SeverityIcon;
  const badgeVariant = severityVariants[digest.severity] || "default";
  const isCyber = digest.category?.toLowerCase() === 'phishing' || digest.category?.toLowerCase() === 'cyber_security';

  return (
    <Card className="mb-4 overflow-hidden shadow-sm transition-shadow hover:shadow-md border-border bg-card">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={badgeVariant} className="font-semibold rounded-sm">
                <Icon className="w-3 h-3 mr-1" />
                {digest.severity}
              </Badge>
              <Badge variant="secondary" className="text-xs rounded-sm">
                {digest.category.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                {new Date(digest.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <CardTitle className="text-lg leading-snug font-medium text-foreground">
              {digest.content}
            </CardTitle>
          </div>
          
          {isCyber && (
            <div className="relative group shrink-0 ml-2">
              <Info className="w-5 h-5 text-red-500 cursor-pointer hover:text-red-600 transition-colors" />
              {/* Added a transparent pt-2 bridge so the mouse doesn't lose hover state when moving to click the link */}
              <div className="absolute right-0 top-full pt-2 hidden group-hover:block w-56 z-50">
                <div className="p-3 bg-red-50 dark:bg-red-950/90 border border-red-200 dark:border-red-900 rounded-md shadow-lg text-xs text-red-800 dark:text-red-300 font-medium">
                  Since you might be on an unsafe network, please check your credentials safely at <a href="https://haveibeenpwned.com" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-red-600 dark:hover:text-red-400">HaveIBeenPwned</a>.
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-3 pb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span>{digest.zone}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30"></span>
            <span className={digest.usedFallback ? "text-muted-foreground" : "text-primary font-medium"}>
              {digest.usedFallback ? "Rule-based" : "AI Verified"}
            </span>
          </div>
          
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-primary font-medium hover:opacity-80 transition-colors"
          >
            {expanded ? "Hide actions" : "View action steps"}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Linked source report tag — always visible */}
        {digest.report && (
          <Link
            to={`/report/${digest.report.id}`}
            className="mt-3 flex items-start gap-2 w-full rounded-md border border-border bg-muted/40 hover:bg-muted/70 transition-colors px-3 py-2 group"
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-foreground">Source Report</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{digest.report.confirmationCount} confirmation{digest.report.confirmationCount !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{digest.report.rawText}</p>
            </div>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
          </Link>
        )}

        {expanded && (
          <div className="mt-4 bg-muted/50 rounded-lg p-4 border border-border animate-in fade-in slide-in-from-top-2">
            <h4 className="text-sm font-semibold text-foreground mb-2">Recommended Actions:</h4>
            <ul className="space-y-2">
              {digest.actionSteps.map((step, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-foreground">
                  <span className="font-bold text-primary">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
