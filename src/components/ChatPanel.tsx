import type { ChatEventPayload } from '../../sdk/src';

interface ChatPanelProps {
  events: ChatEventPayload[];
  className?: string;
}

const prefixMap: Record<ChatEventPayload['type'], string> = {
  assistant_message: 'Assistant',
  tool_call: 'Tool Request',
  tool_result: 'Tool Result',
  approval_required: 'Approval',
  error: 'Error'
};

const formatDetail = (event: ChatEventPayload): string => {
  if (event.type === 'assistant_message') {
    return event.data.content;
  }

  if (event.type === 'tool_call') {
    return `${event.data.toolName} • ${JSON.stringify(event.data.args).slice(0, 120)}`;
  }

  if (event.type === 'tool_result') {
    if (typeof event.data.result === 'string') {
      return event.data.result;
    }
    return JSON.stringify(event.data.result ?? event.data.raw, null, 2).slice(0, 240);
  }

  if (event.type === 'approval_required') {
    return `Requires approval: ${event.data.permissionCheck?.reason ?? 'Pending'}`;
  }

  return event.data.message ?? 'Event received';
};

export default function ChatPanel({ events, className }: ChatPanelProps) {
  return (
    <section
      className={`rounded-2xl border border-border/50 bg-slate-900/90 p-4 text-xs text-slate-200 shadow-xl shadow-slate-900/80 backdrop-blur ${className ?? ''}`}
    >
      <div className="flex items-center justify-between pb-2 text-[0.75rem] uppercase tracking-[0.3em] text-fire/80">
        <span>Event feed</span>
        <span>{events.length} events</span>
      </div>
      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
        {events.slice().reverse().map((event) => (
          <div key={event.id} className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/5 p-2">
            <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-fire/80">
              <span>{prefixMap[event.type]}</span>
              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-xs leading-snug text-slate-200">
              {formatDetail(event)}
            </p>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-center text-[0.7rem] text-slate-500">Listening for new events...</p>
        )}
      </div>
    </section>
  );
}