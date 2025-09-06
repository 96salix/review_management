# 設計書

## 1. アーキテクチャ概要

このアプリケーションは、フロントエンド、バックエンド、データベースの3層で構成されるWebアプリケーションです。各層は独立したDockerコンテナとして実行され、Docker Composeによって統合管理されます。

*   **フロントエンド**: ReactとTypeScriptで構築されたシングルページアプリケーション(SPA)です。Viteをビルドツールおよび開発サーバーとして使用します。
*   **バックエンド**: Node.jsとExpress.js、TypeScriptで構築されたRESTful APIサーバーです。
*   **データベース**: PostgreSQLを使用し、データの永続化を行います。

## 2. 技術スタック

*   **フロントエンド**: React, TypeScript, Vite, react-router-dom
*   **バックエンド**: Node.js, Express.js, TypeScript, node-postgres (pg)
*   **データベース**: PostgreSQL
*   **インフラストラクチャ**: Docker, Docker Compose

## 3. データモデル

主要なデータモデルのTypeScriptインターフェースは以下の通りです。型定義は `app/src/types.ts` と `backend/src/types.ts` に存在します。

```typescript
// ユーザー
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

// レビュアーごとの割り当てと状況
export type ReviewStatus = 'pending' | 'commented' | 'answered' | 'lgtm';

export interface ReviewAssignment {
  reviewer: User;
  status: ReviewStatus;
}

// コメント（スレッド機能付き）
export interface Comment {
  id: string;
  author: User;
  content: string;
  createdAt: string;
  lineNumber?: number;
  parentCommentId?: string; // 親コメントのID
  replies?: Comment[];      // 子コメント（返信）の配列
}

// レビュー段階
export interface ReviewStage {
  id: string;
  name: string;
  assignments: ReviewAssignment[];
  comments: Comment[];
  repositoryUrl: string;
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

// レビュー依頼
export interface ReviewRequest {
  id: string;
  title: string;
  author: User;
  createdAt: string;
  stages: ReviewStage[];
  activityLogs: ActivityLog[];
}

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
```

## 4. APIエンドポイント

バックエンドは以下のRESTful APIエンドポイントを提供します。

### レビュー関連

*   `GET /api/reviews`: 全てのレビュー依頼のリストを取得します。
*   `GET /api/reviews/:id`: 特定のIDのレビュー依頼詳細を取得します。
*   `POST /api/reviews`: 新しいレビュー依頼を作成します。
*   `PUT /api/reviews/:id`: 特定のIDのレビュー依頼を更新します。
*   `PUT /api/reviews/:reviewId/stages/:stageId/assignments/:reviewerId`: レビュアーのステータスを更新します。
*   `POST /api/reviews/:reviewId/stages/:stageId/comments`: ステージにコメントを追加します。

### ユーザー管理

*   `GET /api/users`: 全てのユーザーのリストを取得します。
*   `POST /api/users`: 新しいユーザーを作成します。
*   `PUT /api/users/:id`: 特定のIDのユーザー情報を更新します。
*   `DELETE /api/users/:id`: 特定のIDのユーザーを削除します。

### ステージテンプレート管理

*   `GET /api/stage-templates`: 全てのステージテンプレートのリストを取得します。
*   `POST /api/stage-templates`: 新しいステージテンプレートを作成します。
*   `PUT /api/stage-templates/:id`: 特定のIDのステージテンプレートを更新します。
*   `DELETE /api/stage-templates/:id`: 特定のIDのステージテンプレートを削除します。

## 5. 認証

バックエンドのExpressミドルウェアで認証を処理します。フロントエンドからのリクエストに含まれる `X-User-Id` カスタムヘッダーを検証し、対応するユーザー情報をデータベースから取得して後続の処理で利用します。
