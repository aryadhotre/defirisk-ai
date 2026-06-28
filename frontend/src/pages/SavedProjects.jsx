import { useState, useEffect } from 'react';
import { Trash2, AlertCircle, CheckCircle, Trash, TrendingUp, TrendingDown, Activity, Layers, Droplet } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://defirisk-ai-backend.onrender.com";

export default function SavedProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/defi/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects:', err);
      showNotification('Failed to load protocols', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId, projectName) => {
    setDeleting(projectId);
    try {
      const res = await fetch(`${API_BASE}/defi/projects/${projectId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await res.json();
      setProjects(projects.filter(p => p.id !== projectId));
      showNotification(`Successfully deleted ${projectName}`, 'success');
      setShowConfirm(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      showNotification('Failed to delete protocol', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const deleteAllProjects = async () => {
    setDeleting('all');
    try {
      const projectIds = projects.map(p => p.id);
      const res = await fetch(`${API_BASE}/defi/projects/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_ids: projectIds })
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      const data = await res.json();
      setProjects([]);
      showNotification(`Successfully deleted all ${data.deleted_projects.length} protocols`, 'success');
      setShowDeleteAll(false);
    } catch (err) {
      console.error('Error deleting all projects:', err);
      showNotification('Failed to delete all protocols', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const formatTVL = (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'High': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Color a % change green (up) / red (down)
  const changeColor = (v) => (v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-white/50');
  const fmtPct = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60">Loading protocols...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {notification && (
        <div className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-xl border backdrop-blur-xl ${
          notification.type === 'success'
            ? 'bg-green-500/20 border-green-500/30 text-green-400'
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {showDeleteAll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0a0e14] border border-red-500/30 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Delete All Protocols?</h3>
              <p className="text-white/60 mb-6">
                This will permanently delete all {projects.length} protocols and their historical data. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteAll(false)} disabled={deleting === 'all'}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all font-medium disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={deleteAllProjects} disabled={deleting === 'all'}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-medium disabled:opacity-50">
                  {deleting === 'all' ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Saved Projects</h1>
          <p className="text-white/60">Live risk profiles computed from real on-chain metrics</p>
        </div>
        {projects.length > 0 && (
          <button onClick={() => setShowDeleteAll(true)}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-2 font-medium">
            <Trash className="w-4 h-4" />
            Delete All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="text-sm text-white/60 mb-1">Total Protocols</div>
          <div className="text-3xl font-bold text-white">{projects.length}</div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="text-sm text-white/60 mb-1">Total TVL</div>
          <div className="text-3xl font-bold text-white">
            {formatTVL(projects.reduce((sum, p) => sum + (p.total_value_locked || 0), 0))}
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <div className="text-sm text-white/60 mb-1">Average Risk</div>
          <div className="text-3xl font-bold text-white">
            {projects.length > 0 ? (projects.reduce((sum, p) => sum + (p.risk_score || 0), 0) / projects.length).toFixed(1) : '0'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <div key={project.id}
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all relative">

            {showConfirm === project.id && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10 p-6">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Delete {project.name}?</h3>
                  <p className="text-white/60 mb-6">This will delete all historical data for this protocol.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setShowConfirm(null)}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all">Cancel</button>
                    <button onClick={() => deleteProject(project.id, project.name)} disabled={deleting === project.id}
                      className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50">
                      {deleting === project.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{project.name}</h3>
                  <span className="text-sm text-white/60">{project.protocol_type}</span>
                </div>
                <div className={`px-3 py-1 rounded-lg border text-sm font-medium ${getRiskColor(project.risk_level)}`}>
                  {project.risk_level}
                </div>
              </div>

              {/* TVL + Risk score row */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-white/50 mb-1">Total Value Locked</div>
                  <div className="text-2xl font-bold text-white">{formatTVL(project.total_value_locked)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/50 mb-1">Risk Score</div>
                  <div className="text-2xl font-bold text-white">{project.risk_score?.toFixed(1)}</div>
                </div>
              </div>

              {/* NEW: Real signals grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg">
                  <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Volatility</div>
                    <div className="text-sm text-white font-medium">{project.tvl_volatility?.toFixed(1) ?? '—'}%</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg">
                  <TrendingDown className="w-4 h-4 text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Max Drawdown</div>
                    <div className="text-sm text-white font-medium">{project.max_drawdown?.toFixed(1) ?? '—'}%</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg">
                  {(project.change_7d ?? 0) >= 0
                    ? <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />
                    : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">7d Change</div>
                    <div className={`text-sm font-medium ${changeColor(project.change_7d ?? 0)}`}>
                      {fmtPct(project.change_7d)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg">
                  <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/40 uppercase tracking-wide">Chains</div>
                    <div className="text-sm text-white font-medium">
                      {project.chain_count ?? '—'}
                      {project.top_chain && project.top_chain !== 'Unknown' && (
                        <span className="text-white/40 text-xs ml-1">
                          ({project.top_chain_share?.toFixed(0)}% {project.top_chain})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk breakdown — corrected weights 30/25/25/20 */}
              <div>
                <div className="text-xs text-white/50 mb-2">Risk Breakdown</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-white/60">Smart Contract</span>
                    <span className="text-white">{project.risk_breakdown?.smart_contract_risk ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-white/60">Liquidity</span>
                    <span className="text-white">{project.risk_breakdown?.liquidity_risk ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-white/60">Financial</span>
                    <span className="text-white">{project.risk_breakdown?.financial_risk ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-white/60">Operational</span>
                    <span className="text-white">{project.risk_breakdown?.operational_risk ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Audit + Delete */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-white/60">Audit</span>
                <span className={`text-sm font-medium ${project.audit_status === 'Audited' ? 'text-green-400' : 'text-orange-400'}`}>
                  {project.audit_status}
                </span>
              </div>

              <div className="pt-2 border-t border-white/10">
                <button onClick={() => setShowConfirm(project.id)} disabled={deleting === project.id}
                  className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                  Delete Protocol
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-white mb-2">No protocols yet</h3>
          <p className="text-white/60">Add your first protocol from the Risk Analysis page</p>
        </div>
      )}
    </div>
  );
}