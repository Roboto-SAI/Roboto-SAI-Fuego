import { Button } from '@/components/ui/button';
import type { ApprovalRequiredData } from '../../sdk/src';

interface ToolApprovalModalProps {
  approval?: ApprovalRequiredData;
  open: boolean;
  onApprove: () => void;
  onDeny: () => void;
}

export default function ToolApprovalModal({ approval, open, onApprove, onDeny }: ToolApprovalModalProps) {
  if (!open || !approval) {
    return null;
  }

  const riskLabel = approval.permissionCheck?.riskLevel ?? 'MEDIUM';
  const expiresAt = approval.expiresAt ? new Date(approval.expiresAt).toLocaleTimeString() : 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="max-w-md rounded-2xl border border-fire/60 bg-slate-950 p-6 text-sm text-slate-200 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-fire/80">
          <span>Approval Required</span>
          <span>{riskLabel}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-white">{approval.toolCall.toolName}</h3>
        <p className="mt-2 text-xs text-slate-400">
          {approval.toolCall.description ?? 'A high-risk tool call requires confirmation.'}
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
          <p className="text-[0.75rem] text-fire/80">Tool Source</p>
          <p className="text-sm text-white">{approval.toolCall.source.toUpperCase()} / {approval.toolCall.serverId ?? 'MCP'}</p>
          <pre className="mt-2 max-h-32 overflow-auto text-[0.7rem] text-slate-200">
{JSON.stringify(approval.toolCall.args, null, 2)}
          </pre>
        </div>
        <p className="mt-3 text-[0.65rem] text-slate-500">
          Expires at {expiresAt}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onDeny} className="w-full border border-white/20 text-white/80">
            Deny
          </Button>
          <Button className="w-full bg-fire/70 text-white" onClick={onApprove}>
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}