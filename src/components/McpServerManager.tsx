import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { McpServer } from '../../sdk/src';

interface McpServerManagerProps {
  servers: McpServer[];
  error?: string | null;
  onRefresh: () => void;
  onToggle: (serverId: string, enabled: boolean) => Promise<void> | void;
  togglingServers?: Record<string, boolean>;
}

export default function McpServerManager({
  servers,
  error,
  onRefresh,
  onToggle,
  togglingServers = {}
}: McpServerManagerProps) {
  return (
    <section className="rounded-2xl border border-border/50 bg-slate-900/80 p-4 text-sm text-slate-200 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-fire/80">MCP Servers</p>
          <h3 className="text-lg font-semibold text-white">Local OS Agent</h3>
        </div>
        <Button onClick={onRefresh} size="sm" className="rounded-full border border-white/30 text-xs font-semibold tracking-wide">
          Refresh
        </Button>
      </div>
      <div className="mt-3 grid gap-2 text-xs">
        {servers.map((server) => (
          <div key={server.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-white">{server.name}</p>
              <p className="text-[0.7rem] text-slate-400">{server.description}</p>
              <p className="text-[0.65rem] text-slate-500">
                {server.connected ? 'Connected' : 'Disconnected'} • {server.toolsCount} tools
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-0.5 text-[0.65rem] font-semibold ${server.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                {server.enabled ? 'ENABLED' : 'disabled'}
              </span>
              <Switch
                checked={server.enabled}
                onCheckedChange={(checked) => void onToggle(server.id, checked)}
                disabled={Boolean(togglingServers[server.id])}
              />
            </div>
          </div>
        ))}
        {servers.length === 0 && <p className="text-slate-500">No MCP servers are connected yet.</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </section>
  );
}