import { useState } from 'react';
import { api } from '../api/client';
import { Button } from '@workspace/ui/components/button';
import { Textarea } from '@workspace/ui/components/textarea';
import { Label } from '@workspace/ui/components/label';
import { Switch } from '@workspace/ui/components/switch';
import { MapPin, Loader2, Send, Search, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@workspace/ui/components/input';

export function SubmitReport() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [locationMode, setLocationMode] = useState<'gps' | 'search'>('search');
  const [manualZone, setManualZone] = useState('');
  const [manualCity, setManualCity] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.length < 10) {
      setError('Report must be at least 10 characters long.');
      return;
    }

    if (locationMode === 'search' && !manualZone) {
      setError('Please provide a Zone/Locality.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: any = { rawText: text, isAnonymous };
      
      if (locationMode === 'gps' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
          const geo = await res.json();
          const addr = geo.address || {};
          payload.city = addr.city || addr.town || addr.village || addr.county || addr.state || geo.name || "Unknown";
          payload.zone = addr.neighbourhood || addr.suburb || addr.district || addr.quarter || addr.subdivision || addr.road || geo.name || "General Zone";
        } catch (e) {
          console.warn('Geolocation or reverse geocoding failed', e);
          setError('Failed to securely fetch location via GPS. Please use Manual Input.');
          setLoading(false);
          return;
        }
      } else if (locationMode === 'search') {
        payload.zone = manualZone;
        if (manualCity) payload.city = manualCity;
      }

      await api.reports.create(payload);

      setSuccess(true);
      setTimeout(() => {
        navigate('/feed');
      }, 2000);
      
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="py-16 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <Send className="w-8 h-8 ml-1" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Report received</h2>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
          Your report has been received and is being reviewed by the community safety system.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Report an Incident</h2>
        <p className="text-muted-foreground text-sm mt-1">Help keep your community safe by reporting suspicious activity.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="report-text" className="text-base font-medium">What happened?</Label>
          <Textarea 
            id="report-text"
            placeholder="Describe the incident clearly (e.g. 'Got a scam call claiming to be my bank...')"
            className="min-h-32 text-base resize-y bg-background"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Minimum 10 characters.</span>
            <span className={text.length >= 10 ? 'text-primary font-medium' : ''}>{text.length} chars</span>
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive-foreground bg-destructive/10 p-3 rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="anonymous-toggle" className="text-sm font-medium">Post Anonymously</Label>
              <p className="text-xs text-muted-foreground">Submit without earning trust score</p>
            </div>
            <Switch 
              id="anonymous-toggle" 
              checked={isAnonymous} 
              onCheckedChange={setIsAnonymous} 
            />
          </div>

          <div className="pt-4 border-t border-border">
            <Label className="text-sm font-medium mb-3 block">Location Source</Label>
            
            <div className="flex bg-background border border-border rounded-lg p-1 space-x-1 mb-4">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-colors ${locationMode === 'gps' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setLocationMode('gps')}
              >
                <Navigation className="w-3 h-3" /> Auto GPS
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-colors ${locationMode === 'search' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setLocationMode('search')}
              >
                <Search className="w-3 h-3" /> Manual Input
              </button>
            </div>

            {locationMode === 'search' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="manual-zone" className="text-xs text-muted-foreground">Zone / Locality *</Label>
                    <Input id="manual-zone" placeholder="e.g. Nandi Nagar" value={manualZone} onChange={e => setManualZone(e.target.value)} required={locationMode === 'search'} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-city" className="text-xs text-muted-foreground">City *</Label>
                    <Input id="manual-city" placeholder="e.g. Hyderabad" value={manualCity} onChange={e => setManualCity(e.target.value)} required={locationMode === 'search'} className="h-9" />
                  </div>
                </div>
              </div>
            )}
            
            {locationMode === 'gps' && (
              <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded flex items-start gap-2 border border-primary/20">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>When you submit, your browser will momentarily request GPS permissions to precisely geocode the incident location. We securely resolve this and discard exact coordinates.</span>
              </p>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {loading ? 'Submitting...' : 'Submit Report'}
        </Button>
      </form>
    </div>
  );
}
