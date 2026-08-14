import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/component-library";
import type { ApprovalOutcome, ApprovalRequest } from "@/infrastructure/dshTypes";
import "./ApprovalCard.scss";

interface ApprovalCardProps {
  request: ApprovalRequest;
  onResolve: (approvalId: string, outcome: ApprovalOutcome) => void;
  disabled?: boolean;
}

export function ApprovalCard({ request, onResolve, disabled = false }: ApprovalCardProps) {
  const [busy, setBusy] = useState(false);

  function handleAction(outcome: ApprovalOutcome) {
    setBusy(true);
    onResolve(request.approvalId, outcome);
  }

  return (
    <div className="dshg-approval-card">
      <div className="dshg-approval-card__left">
        <div className="dshg-approval-card__icon-box">
          <AlertTriangle size={20} />
        </div>
        <div className="dshg-approval-card__text">
          <h4>操作审批请求</h4>
          <p>
            智能体请求执行工具 <code>{request.toolName}</code>
            {request.reason ? `: ${request.reason}` : "，需要您的安全授权。"}
          </p>
        </div>
      </div>

      <div className="dshg-approval-card__actions">
        <Button
          disabled={disabled || busy}
          onClick={() => handleAction("rejected")}
        >
          <X size={13} />
          <span>拒绝</span>
        </Button>
        <Button
          variant="primary"
          disabled={disabled || busy}
          onClick={() => handleAction("allowed-once")}
        >
          <Check size={13} />
          <span>允许一次</span>
        </Button>
      </div>
    </div>
  );
}
