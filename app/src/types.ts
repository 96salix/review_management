// ユーザー
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

// レビュアーごとの割り当てと状況
export type ReviewStatus = 'pending' | 'commented' | 'answered' | 'lgtm';

export const ReviewStatuses = {
  PENDING: 'pending',
  COMMENTED: 'commented',
  ANSWERED: 'answered',
  LGTM: 'lgtm',
} as const;

export type ReviewStatusValue = typeof ReviewStatuses[keyof typeof ReviewStatuses];

export interface ReviewAssignment {
  reviewer: User;
  status: ReviewStatus;
}

// コメント
export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  lineNumber?: number;
}

// アクティビティログ
export type ActivityLogType = 'CREATE' | 'STATUS_CHANGE' | 'COMMENT';
export interface ActivityLog {
    id: string;
    type: ActivityLogType;
    user: User;
    details: string;
    createdAt: string;
}

// レビュー段階
export interface ReviewStage {
  id: string;
  name: string;
  assignments: ReviewAssignment[];
  comments: Comment[];
  repositoryUrl: string;
}

// レビュー依頼
export interface ReviewRequest {
  id: string;
  title: string;
  author: User;
  createdAt: string;
  stages: ReviewStage[];
  activityLogs: ActivityLog[];
}

// --- Stage Template ---

// ステージテンプレートのステージ定義
export interface TemplateStage {
  name: string;
  reviewerIds: string[];
}

// ステージテンプレート
export interface StageTemplate {
  id: string;
  name: string;
  stages: TemplateStage[];
}
