import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

const API_BASE = "https://defirisk-ai-backend.onrender.com";

export default function TVLAnalytics() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [timeframe, setTimeframe] = useState(30);
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    loadProjects();
    loadTrends();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadHistory(selectedProject.id);
    }
  }, [selectedProject, timeframe]);

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/defi/projects`);
      const data = await res.json();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0]);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/trends?days=7`);
      const data = await res.json();
      setTrends(data.trends || []);
    } catch (err) {
      console.error('Error loading trends:', err);
    }
  };

  const loadHistory = async (projectId) => {
    try {
      const res = await fetch(`${API_BASE}/analytics/history/${projectId}?days=${timeframe}`);
      const data = await res.json();
      
      // Transform data for chart
      const chartData = data.history.map(h => ({
        date: new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tvl: h.tvl / 1000000, // Convert to millions
        fullDate: h.timestamp
      }));
      
      setHistoryData(chartData);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const formatTVL = (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const calculateChange = (project) => {
    const trend = trends.find(t => t.project_id === project.id);
    if (!trend) return { value: 0, percent: 0 };
    
    // Calculate TVL change from history if available
    if (historyData.length >= 2) {
      const oldest = historyData[0].tvl * 1000000;
      const newest = historyData[historyData.length - 1].tvl * 1000000;
      const change = newest - oldest;
      const percent = (change / oldest) * 100;
      return { value: change, percent };
    }
    
    return { value: 0, percent: 0 };
  };

  const getTrendColor = (percent) => {
    if (percent > 0) return 'text-green-400';
    if (percent < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getTrendIcon = (percent) => {
    if (percent > 0) return <TrendingUp className="w-4 h-4" />;
    if (percent < 0) return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Protocol Analytics</h1>
        <p className="text-white/60">Track TVL movements and market performance</p>
      </div>

      {/* Market Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Market TVL */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 text-white/60 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">Total Market TVL</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {formatTVL(projects.reduce((sum, p) => sum + (p.total_value_locked || 0), 0))}
          </div>
        </div>

        {/* Tracked Protocols */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 text-white/60 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Tracked Protocols</span>
          </div>
          <div className="text-3xl font-bold text-white">{projects.length}</div>
        </div>

        {/* Avg Risk */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-2 text-white/60 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Average Risk Score</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {(projects.reduce((sum, p) => sum + (p.risk_score || 0), 0) / projects.length).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-8">
        {/* Chart Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === parseInt(e.target.value));
                setSelectedProject(project);
              }}
              className="bg-[#0a0e14] border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer hover:border-white/30 transition-colors"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-[#0a0e14] text-white">
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={timeframe}
              onChange={(e) => setTimeframe(parseInt(e.target.value))}
              className="bg-[#0a0e14] border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer hover:border-white/30 transition-colors"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
            >
              <option value={7} className="bg-[#0a0e14] text-white">7 days</option>
              <option value={14} className="bg-[#0a0e14] text-white">14 days</option>
              <option value={30} className="bg-[#0a0e14] text-white">30 days</option>
              <option value={90} className="bg-[#0a0e14] text-white">90 days</option>
            </select>
          </div>

          {selectedProject && (
            <div className="text-right">
              <div className="text-sm text-white/60">Current TVL</div>
              <div className="text-2xl font-bold text-white">
                {formatTVL(selectedProject.total_value_locked)}
              </div>
            </div>
          )}
        </div>

        {/* TVL Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.4)"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.4)"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value.toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => [`$${value.toFixed(2)}M`, 'TVL']}
              />
              <Line 
                type="monotone" 
                dataKey="tvl" 
                stroke="#818cf8" 
                strokeWidth={2}
                dot={{ fill: '#818cf8', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Protocol List with Changes */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Protocol Performance (Last 7 Days)</h2>
        
        <div className="space-y-3">
          {projects.map(project => {
            const trend = trends.find(t => t.project_id === project.id);
            const changePercent = trend?.risk_change_percent || 0;
            
            return (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-white font-medium">{project.name}</div>
                    <div className="text-sm text-white/60">{project.protocol_type}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {formatTVL(project.total_value_locked)}
                    </div>
                    <div className="text-xs text-white/60">TVL</div>
                  </div>

                  <div className={`flex items-center gap-2 ${getTrendColor(changePercent)}`}>
                    {getTrendIcon(changePercent)}
                    <span className="font-medium">
                      {changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-white text-sm">Risk: {project.risk_score.toFixed(1)}</div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      project.risk_level === 'Low' ? 'bg-green-500/20 text-green-400' :
                      project.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {project.risk_level}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}