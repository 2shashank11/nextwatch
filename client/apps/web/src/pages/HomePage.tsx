import { Link } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { ShieldCheck, ShieldAlert, Users, TrendingUp } from 'lucide-react';

export function HomePage() {
  return (
    <div className="py-12 space-y-16 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-6 max-w-2xl mx-auto pt-8">
        <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-sm">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Community Safety, <span className="text-primary">Evolved</span>.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Nexwatch relies on your community to identify scams, hazards, and crime with verifiable safety scoring and AI summarization. 
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/auth">
            <Button size="lg" className="h-12 px-8 text-base">Get Started</Button>
          </Link>
          <Link to="/feed">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-background">View Alerts</Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-12 border-t border-border">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <ShieldAlert className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-bold mb-2">Live Alerts</h3>
          <p className="text-sm text-muted-foreground">Catch localized warnings regarding phishing, theft, or hazards instantly.</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <Users className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-bold mb-2">Verified Crowdsourcing</h3>
          <p className="text-sm text-muted-foreground">Incident validity backed by real neighbors with transparent cross-voted trust scores.</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <TrendingUp className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-lg font-bold mb-2">Trend Analysis</h3>
          <p className="text-sm text-muted-foreground">Keep an eye on security spikes across different zones.</p>
        </div>
      </div>
    </div>
  );
}
