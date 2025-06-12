// Types pour les overlays de tutoriel
export interface TutorialOverlay {
  id: string;
  target: string;
  title: string;
  content: string;
  position: OverlayPosition;
  style: OverlayStyle;
  backdrop: boolean;
  closable: boolean;
}

export type OverlayPosition = 
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface OverlayStyle {
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  maxWidth?: number;
  padding?: number;
  arrow?: boolean;
}

export interface OverlayProps {
  overlay: TutorialOverlay;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
  onSkip?: () => void;
}