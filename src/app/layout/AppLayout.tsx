import { WorkspaceBody } from "./WorkspaceBody";
import { PresentationFrame } from "../components/WindowFrame/PresentationFrame";
import "./AppLayout.scss";

export function AppLayout() {
  return (
    <div className="dshg-app-layout">
      <PresentationFrame>
        <WorkspaceBody />
      </PresentationFrame>
    </div>
  );
}
