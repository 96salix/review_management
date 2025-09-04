# 設計書

## 1. 技術スタック

*   **フロントエンド**: React, TypeScript, Vite, react-router-dom
*   **バックエンド**: Node.js (Express.js), TypeScript
*   **データベース**: (現在インメモリデータストアを使用。将来的にPostgreSQLまたはMySQLを想定)

## 2. データモデル

以下のTypeScriptインターフェースがフロントエンドとバックエンドで共有されています。

```typescript
// ユーザー
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

// レビュアーごとの割り当てと状況
export type ReviewStatus = 'pending' | 'reviewing' | 'commented' | 'approved';

export const ReviewStatuses = {
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  COMMENTED: 'commented',
  APPROVED: 'approved',
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
  // 特定行へのコメントの場合
  lineNumber?: number;
}

// レビュー段階
export interface ReviewStage {
  id: string;
  name: string; // e.g., "1st Round", "Security Check"
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
}
```

## 3. APIエンドポイント

バックエンドは以下のRESTful APIエンドポイントを提供します。

*   **`GET /api/reviews`**
    *   **説明**: すべてのレビュー依頼のリストを取得します。
    *   **レスポンス**: `ReviewRequest[]`

*   **`GET /api/reviews/:id`**
    *   **説明**: 特定のIDを持つレビュー依頼の詳細を取得します。
    *   **パラメータ**: `:id` - レビュー依頼のID。
    *   **レスポンス**: `ReviewRequest` または `404 Not Found`。

*   **`POST /api/reviews`**
    *   **説明**: 新しいレビュー依頼を作成します。
    *   **リクエストボディ**: `Omit<ReviewRequest, 'id' | 'createdAt' | 'author'>` （`title` と `stages` を含む）。
    *   **レスポンス**: 作成された `ReviewRequest` オブジェクト (`201 Created`)。

*   **`PUT /api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId`**
    *   **説明**: 特定のレビュー依頼の特定のステージにおけるレビュアーのステータスを更新します。
    *   **パラメータ**: `:reviewId`, `:stageId`, `:reviewerId`。
    *   **リクエストボディ**: `{ status: ReviewStatusValue }`。
    *   **レスポンス**: 更新された `ReviewRequest` オブジェクト。

*   **`POST /api/reviews/:reviewId/stages/:stageId/comments`**
    *   **説明**: 特定のレビュー依頼の特定のステージにコメントを追加します。
    *   **パラメータ**: `:reviewId`, `:stageId`。
    *   **リクエストボディ**: `{ content: string, lineNumber?: number }`。
    *   **レスポンス**: 更新された `ReviewRequest` オブジェクト。

## 4. 認証シミュレーション

バックエンドは、ミドルウェアで `users[0]` を現在のユーザー (`req.currentUser`) として設定することで、簡易的な認証をシミュレートしています。これは開発目的であり、本番環境では適切な認証システムに置き換える必要があります。