import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState<'idle'|'fetching'|'done'|'error'>('idle');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const navigate = useNavigate();

  const [manualZone, setManualZone] = useState('');
  const [manualCity, setManualCity] = useState('');



  const handleLocation = () => {
    setLocationStatus('fetching');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setError('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
          if (!res.ok) throw new Error();
          const geo = await res.json();
          const addr = geo.address || {};
          const exactCity = addr.city || addr.town || addr.village || addr.county || addr.state || geo.name || "Unknown";
          const exactZone = addr.neighbourhood || addr.suburb || addr.district || addr.quarter || addr.subdivision || addr.road || geo.name || "General Zone";
          
          setCoords({ 
            lat: 0,
            lng: 0,
            cityOverride: exactCity,
            zoneOverride: exactZone
          } as any);
          setLocationStatus('done');
        } catch (e) {
          setLocationStatus('error');
          setError('Location resolved but failed to reverse-geocode to a Zone.');
        }
      },
      () => {
        setLocationStatus('error');
        setError('Location permission is strictly required to join a zone.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (locationStatus !== 'done' && (!manualZone || !manualCity)) {
      setError('Please fetch your location via GPS or explicitly fill in Zone and City.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const res = await api.auth.login({ 
          email, 
          password,
          city: locationStatus === 'done' ? (coords as any)?.cityOverride : manualCity,
          zone: locationStatus === 'done' ? (coords as any)?.zoneOverride : manualZone
        });
        login(res.token, res.user);
        navigate('/feed');
      } else {
        const res = await api.auth.register({
          fullName,
          email,
          password,
          city: locationStatus === 'done' ? (coords as any)?.cityOverride : manualCity,
          zone: locationStatus === 'done' ? (coords as any)?.zoneOverride : manualZone
        });
        login(res.token, res.user);
        navigate('/feed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-xl shadow-sm border border-border">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-foreground">
            {isLogin ? 'Sign in to Nexwatch' : 'Join Your Neighborhood Watch'}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {isLogin ? 'Welcome back' : 'Register to verify alerts and submit reports'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullname">Full Name</Label>
                <Input 
                  id="fullname" 
                  autoComplete="name" 
                  required 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="bg-background"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                autoComplete="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                autoComplete={isLogin ? "current-password" : "new-password"} 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-4 pt-2">
              <Label>Set Your Active Community Zone</Label>
              
              <div className="flex flex-col gap-3">
                {locationStatus !== 'done' && (
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="space-y-1">
                      <Label htmlFor="manual-zone" className="text-xs text-muted-foreground">Zone / Locality *</Label>
                      <Input id="manual-zone" placeholder="e.g. Nandi Nagar" value={manualZone} onChange={e => setManualZone(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="manual-city" className="text-xs text-muted-foreground">City *</Label>
                      <Input id="manual-city" placeholder="e.g. Hyderabad" value={manualCity} onChange={e => setManualCity(e.target.value)} className="h-9" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="h-px bg-border flex-1"></div>
                  <span className="text-xs text-muted-foreground uppercase font-medium">Or</span>
                  <div className="h-px bg-border flex-1"></div>
                </div>

                {locationStatus === 'done' ? (
                  <div className="text-sm text-primary flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-md font-medium">
                    <MapPin className="w-4 h-4"/> Location fetched securely
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={handleLocation}
                    disabled={locationStatus === 'fetching'}
                  >
                    {locationStatus === 'fetching' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    Auto-locate via GPS
                  </Button>
                )}
              </div>

              {locationStatus === 'error' && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Auto-location failed. Please search manually above.
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded border border-border">
                <strong>Privacy Disclaimer:</strong> We only process your exact pinpointed GPS coordinates locally in this browser. We immediately discard your pin and exclusively send your final <b>Zone</b> and <b>City</b> name to our servers dynamically!
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
          
          <div className="text-center">
            <button
              type="button"
              className="text-sm font-medium text-primary hover:text-primary/80"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
