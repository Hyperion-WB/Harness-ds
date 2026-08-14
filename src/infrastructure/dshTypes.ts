/**
 * Type definitions for DeepSeek Harness (dsh) Headless API Gateway,
 * RPC protocols, and WebSocket Mux/Host streaming events.
 */

export interface WorkspaceView {
  workspaceId: string;
  path: string;
  title: string;
  sessionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceListResult {
  items: WorkspaceView[];
  archivedSessionIds: string[];
}

export interface SessionSummary {
  sessionId: string;
  title: string;
  cwd: string;
  agentPreset?: string;
  parentSessionId?: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
  messageCount?: number;
  isRunning?: boolean;
}

export interface SessionModelSelection {
  provider: string;
  model: string;
  reasoningEffort?: string;
}

export interface AskUserQuestionOption {
  label: string;
  description?: string;
}

export interface AskUserQuestionItem {
  id: string;
  question: string;
  header?: string;
  detail?: string;
  options?: AskUserQuestionOption[];
  multiSelect?: boolean;
  intent?: {
    kind: "plan-review";
    approve: string;
  };
}

export interface AskUserQuestionAnswer {
  id: string;
  selected: string[];
  custom?: string;
}

export interface ApprovalRequest {
  approvalId: string;
  sessionId: string;
  toolName: string;
  callId?: string;
  reason?: string;
}

export type ApprovalOutcome = "allowed-once" | "rejected" | "cancelled" | "unavailable";

export interface ToolCallView {
  callId: string;
  toolName: string;
  parameters: Record<string, unknown> | string;
  status: "calling" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

export interface TaskJobView {
  id: string;
  kind: string;
  label: string;
  status: "running" | "stopping" | "completed" | "killed" | "failed";
  detail?: string;
  startedAt: number;
  finishedAt?: number;
}

export interface AgentPresetItem {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface ContentPartText {
  type: "text";
  text: string;
}

export interface ContentPartReasoning {
  type: "reasoning";
  reasoning: string;
}

export interface ContentPartToolCall {
  type: "tool-call";
  callId: string;
  name: string;
  arguments: string;
}

export interface ContentPartToolResult {
  type: "tool-result";
  callId: string;
  content: string;
  isError?: boolean;
}

export type ChatMessageContentPart =
  | ContentPartText
  | ContentPartReasoning
  | ContentPartToolCall
  | ContentPartToolResult;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  toolCalls?: ToolCallView[];
  parts?: ChatMessageContentPart[];
  createdAt: number;
  isStreaming?: boolean;
  error?: string;
}

/**
 * Raw Mux Frames dispatched over WebSocket /api/events.mux
 */
export type MuxFrame =
  | {
      type: "session/event";
      sessionId: string;
      event: {
        type: string;
        seq?: number;
        data?: Record<string, unknown>;
        [key: string]: unknown;
      };
      view?: ToolCallView;
    }
  | {
      type: "session/subscribed";
      sessionId: string;
      lastSeq: number;
    }
  | {
      type: "approval/requested";
      sessionId: string;
      approvalId: string;
      toolName: string;
      callId?: string;
      reason?: string;
    }
  | {
      type: "approval/resolved";
      sessionId: string;
      approvalId: string;
      outcome: ApprovalOutcome;
    }
  | {
      type: "question/requested";
      sessionId: string;
      questions: AskUserQuestionItem[];
    }
  | {
      type: "question/resolved";
      sessionId: string;
      questionRpcId: string;
      outcome: "answered" | "cancelled";
    }
  | {
      type: "session/queue";
      sessionId: string;
      items: Array<{
        id: string;
        placement: "queued" | "steering" | "context";
        message: {
          id: string;
          role: "system" | "user" | "assistant";
          content: Array<{ type: string; text?: string; [k: string]: unknown }>;
        };
      }>;
    }
  | {
      type: "session/jobs";
      sessionId: string;
      jobs: TaskJobView[];
    }
  | {
      type: "session/projection";
      sessionId: string;
      key: string;
      value: unknown;
      seq: number;
    }
  | {
      type: "stream/error";
      error: { code: string; message: string };
    };

/**
 * Raw Host Frames dispatched over WebSocket /api/events.host
 */
export type HostFrame =
  | {
      type: "host/session-added";
      sessionId: string;
      blank: boolean;
      parentSessionId?: string;
      origin?: "subagent";
      cwd?: string;
      agentPreset?: string;
    }
  | {
      type: "host/session-removed";
      sessionId: string;
    }
  | {
      type: "host/session-status";
      sessionId: string;
      running: boolean;
    }
  | {
      type: "host/agent-error";
      sessionId: string;
      message: string;
    }
  | {
      type: "host/workspace-changed";
      workspace: WorkspaceView;
    }
  | {
      type: "host/workspace-removed";
      workspaceId: string;
    }
  | {
      type: "host/workspace-order-changed";
      workspaceIds: string[];
    }
  | {
      type: "host/archived-sessions-changed";
      archivedSessionIds: string[];
    }
  | {
      type: "host/remote-event";
      event: string;
      args: unknown[];
    }
  | {
      type: "stream/error";
      error: { code: string; message: string };
    };
