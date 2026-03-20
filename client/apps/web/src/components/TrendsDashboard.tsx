import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@workspace/ui/components/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import { Loader2, MapPin, Globe } from 'lucide-react';

export function TrendsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'zone' | 'city'>('zone');

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        let params = {};
        if (activeTab === 'zone' && user?.zone) params = { zone: user.zone };
        if (activeTab === 'city' && user?.city) params = { city: user.city };

        const data = await api.stats.get(params);
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      fetchStats();
    }
  }, [activeTab, user?.zone, user?.city]);

  if (loading || !stats) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Format data for Recharts
  const categoryData = Object.entries(stats.categoryCounts).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value
  }));

  const severityData = Object.entries(stats.severityCounts).map(([name, value]) => ({
    name,
    value
  }));

  // Format the 7 days chart data nicely (e.g., "MM/DD")
  const trendData = stats.last7Days?.map((item: any) => {
    const d = new Date(item.date);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      count: item.count
    };
  }) || [];

  const SEVERITY_COLORS = {
    CRITICAL: '#ef4444', // red-500
    HIGH: '#f97316',     // orange-500
    MEDIUM: '#eab308',   // yellow-500
    LOW: '#3b82f6',      // blue-500
    NONE: '#94a3b8'      // slate-400
  };

  const CATEGORY_COLORS = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f43f5e", // rose
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
  ];

  const totalReports = Object.values(stats.severityCounts).reduce((a: any, b: any) => a + b, 0);
  const currentScope = activeTab === 'zone' ? user?.zone : user?.city;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Security Trends</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Analytics for <span className="font-semibold text-primary">{currentScope}</span>
          </p>
        </div>

        <div className="bg-card border border-border p-1 rounded-lg flex gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('zone')}
            className={`flex-1 sm:px-6 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'zone' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <MapPin className="w-4 h-4" /> My Zone
          </button>
          <button
            onClick={() => setActiveTab('city')}
            className={`flex-1 sm:px-6 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'city' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Globe className="w-4 h-4" /> My City
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Reports (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalReports as any}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.severityCounts?.CRITICAL || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 7-Day Trend Chart */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">7-Day Incident Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 500 }}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#2563eb" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Incident Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(59,130,246,0.05)' }} contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 500 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center flex-col items-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(SEVERITY_COLORS as any)[entry.name] || SEVERITY_COLORS.NONE} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 mb-2 text-xs font-medium text-slate-600 flex-wrap justify-center">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.CRITICAL }}></span> CRITICAL</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.HIGH }}></span> HIGH</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.MEDIUM }}></span> MEDIUM</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS.LOW }}></span> LOW</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
