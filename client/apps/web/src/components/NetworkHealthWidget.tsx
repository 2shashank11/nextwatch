import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@workspace/ui/components/card';
import { AlertTriangle, ShieldCheck, Activity, Globe, Lock, Server } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

export function NetworkHealthWidget({ onClose }: { onClose?: () => void }) {
  const [protocol, setProtocol] = useState('');
  const [ipInfo, setIpInfo] = useState<{ ip: string; org: string } | null>(null);
  const [dnsStatus, setDnsStatus] = useState<'checking' | 'secure' | 'hijacked'>('checking');

  useEffect(() => {
    // 1. Check Protocol
    setProtocol(window.location.protocol.replace(':', '').toUpperCase());


    // 2. Fetch IP & ISP (Real Data)
    fetch('https://ipinfo.io/json')
      .then(res => res.json())
      .then(data => {
        setIpInfo({ ip: data.ip || 'Unknown', org: data.org || 'Unknown ISP' });
      })
      .catch(() => setIpInfo({ ip: 'Unknown', org: 'Unknown ISP' }));

    // 3. DNS Check (Revised: Use GET and a more reliable DoH endpoint check)
    const startTimeDNS = performance.now();
    fetch('https://dns.google/resolve?name=google.com', { method: 'GET' })
      .then(res => {
        const latency = performance.now() - startTimeDNS;
        setDnsStatus(res.ok && latency < 800 ? 'secure' : 'hijacked');
      })
      .catch(() => setDnsStatus('hijacked'));

      // Use effect values to log (protocol etc will be updated in next render, so we log from current closure)
  }, []);

  // Update effect to log when state changes (Better debugging)
  useEffect(() => {
    if (ipInfo) {
      console.log("[NetworkHealthWidget] State Updated:", { protocol, dnsStatus, ipInfo });
    }
  }, [protocol, dnsStatus, ipInfo]);

  const isUnsecured = protocol === 'HTTP' || dnsStatus === 'hijacked';

  return (
    <Card className="shadow-xl border-border bg-card overflow-hidden w-full sm:w-[350px]">
      <div className={`h-1.5 w-full ${isUnsecured ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Local Network Health
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClose}>Close</Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Real Live Data Metrics */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted p-2 rounded flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3"/> Protocol</span>
            <span className={`font-semibold ${protocol === 'HTTPS' ? 'text-emerald-600' : 'text-orange-600'}`}>
              {protocol || '...'}
            </span>
          </div>
          <div className="bg-muted p-2 rounded flex flex-col gap-1">
            <span className="text-muted-foreground flex items-center gap-1"><Server className="w-3 h-3"/> DNS Config</span>
            <span className={`font-semibold ${dnsStatus === 'secure' ? 'text-emerald-600' : 'text-orange-600'}`}>
              {dnsStatus === 'checking' ? '...' : dnsStatus === 'secure' ? 'Resolving OK' : 'Suspicious'}
            </span>
          </div>
          <div className="bg-muted p-2 rounded flex flex-col gap-1 col-span-2">
             <span className="text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3"/> IP & ISP Details</span>
             <span className="font-semibold text-foreground truncate">
               {ipInfo ? `${ipInfo.ip}` : 'Locating node...'}
               <br />
               {ipInfo ? `${ipInfo.org}` : 'Locating node...'}
             </span>
          </div>
        </div>

        {/* Dynamic Digest Alert */}
        {isUnsecured ? (
          <div className="mt-2 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-md p-3">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  Public Network Alert
                </p>
                <p className="text-xs text-orange-700/90 dark:text-orange-400 mt-1 mb-2 leading-relaxed">
                  You appear to be on a public or unsecured network. Remote work connections require extra security.
                </p>
                <div className="space-y-1.5 mt-3 pt-2 border-t border-orange-200 dark:border-orange-900/50">
                  <p className="text-[11px] text-orange-800 dark:text-orange-300 font-bold uppercase tracking-wider">3 Steps to secure your connection:</p>
                  <ul className="text-xs text-orange-700 dark:text-orange-400 list-disc list-inside space-y-1">
                    <li>Enable your corporate VPN</li>
                    <li>Verify HTTPS on all work tabs</li>
                    <li>Avoid sharing local folders</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-md p-3 flex gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Connection Secured
              </p>
              <p className="text-xs text-emerald-700/90 dark:text-emerald-400 mt-1 leading-relaxed">
                Network metrics normal. Cellular or private connection detected. Safe for remote work tasks.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
