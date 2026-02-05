import { Switch } from '@/components/ui/switch';
import type { McpServer } from '../../sdk/src';

interface McpAppFrameProps {
  servers: McpServer[];
  allowedTools: Record<string, boolean>;
  onToggleTool: (serverId: string, toolName: string, enabled: boolean) => void;
}

const DEFAULT_TOOL_ARGS: Record<string, Record<string, unknown>> = {
  fs_listDir: { path: 'R:\\' },
  fs_readFile: { path: 'R:\\Repos\\Roboto-SAI-2026\\README.md', encoding: 'utf-8' },
  fs_writeFile: {
    path: 'R:\\Repos\\Roboto-SAI-2026\\data\\roboto_note.txt',
    content: 'Roboto SAI tool write',
    createDirs: true
  },
  fs_searchInFiles: {
    rootPath: 'R:\\Repos\\Roboto-SAI-2026',
    query: 'Roboto',
    filePattern: '.md',
    maxResults: 5
  },
  browser_openPage: { url: 'https://example.com' },
  email_sendEmail: { to: 'demo@example.com', subject: 'Roboto SAI', body: 'Test message' },
  twitter_postTweet: { content: 'Hello from Roboto SAI' }
};

const buildToolKey = (serverId: string, toolName: string) => `${serverId}:${toolName}`;

const buildFallbackArgs = (schema?: Record<string, unknown>): Record<string, unknown> | null => {
  if (!schema || typeof schema !== 'object') {
    return null;
  }
  const properties = (schema as { properties?: Record<string, { type?: string }> }).properties;
  if (!properties || typeof properties !== 'object') {
    return null;
  }
  const defaults: Record<string, unknown> = {};
  Object.entries(properties).forEach(([key, spec]) => {
    if (spec?.type === 'boolean') {
      defaults[key] = false;
    } else if (spec?.type === 'number' || spec?.type === 'integer') {
      defaults[key] = 0;
    } else {
      defaults[key] = '';
    }
  });
  return defaults;
};

export default function McpAppFrame({ servers, allowedTools, onToggleTool }: McpAppFrameProps) {
  return (
    <section className="rounded-2xl border border-border/50 bg-slate-950/80 p-5 text-sm text-slate-200 shadow-xl shadow-slate-950/70">
      <header className="mb-2 text-xs uppercase tracking-[0.4em] text-fire/80">MCP Tool Access</header>
      <p className="text-[0.75rem] text-slate-400">
        Toggle tools to allow Roboto SAI to use them automatically. Preset arguments are shown for reference.
      </p>
      <div className="mt-4 space-y-4">
        {servers.length === 0 && (
          <p className="text-[0.75rem] text-slate-500">No MCP servers reported yet.</p>
        )}
        {servers.map((server) => (
          <div key={server.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{server.name}</p>
                <p className="text-[0.7rem] text-slate-400">{server.description}</p>
              </div>
              <span className={`rounded-full px-3 py-0.5 text-[0.65rem] font-semibold ${server.connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
                {server.connected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {server.tools.length === 0 && (
                <p className="text-[0.75rem] text-slate-500">No tools registered yet.</p>
              )}
              {server.tools.map((tool) => {
                const key = buildToolKey(server.id, tool.name);
                const isAllowed = allowedTools[key] !== false;
                const preset = DEFAULT_TOOL_ARGS[tool.name] ?? buildFallbackArgs(tool.inputSchema as Record<string, unknown>);
                return (
                  <div key={key} className="rounded-lg border border-white/10 bg-slate-900/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{tool.name}</p>
                        <p className="text-[0.7rem] text-slate-400">{tool.description || 'No description provided.'}</p>
                      </div>
                      <Switch
                        checked={isAllowed}
                        onCheckedChange={(checked) => onToggleTool(server.id, tool.name, checked)}
                      />
                    </div>
                    <div className="mt-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">Preset arguments</p>
                      {preset ? (
                        <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-black/40 p-2 text-[0.65rem] text-slate-200">
                          {JSON.stringify(preset, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-[0.7rem] text-slate-500">No preset arguments configured.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}