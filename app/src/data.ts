import { User, ReviewRequest } from './types';

export let users: User[] = [
  { id: '1', name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?u=alice' },
  { id: '2', name: 'Bob', avatarUrl: 'https://i.pravatar.cc/150?u=bob' },
  { id: '3', name: 'Charlie', avatarUrl: 'https://i.pravatar.cc/150?u=charlie' },
  { id: '4', name: 'David', avatarUrl: 'https://i.pravatar.cc/150?u=david' },
  { id: '5', name: 'Eve', avatarUrl: 'https://i.pravatar.cc/150?u=eve' },
];

export let reviews: ReviewRequest[] = [
  {
    id: '1',
    title: '[WIP] 機能: リアルタイムコラボレーション',
    author: users[0], // Alice
    createdAt: '2024-08-30T10:00:00Z',
    stages: [
      {
        id: '1-1',
        name: '1st Round',
        repositoryUrl: 'https://github.com/example/project/pull/123',
        assignments: [
          { reviewer: users[1], status: 'lgtm' }, // Bob (was approved)
          { reviewer: users[2], status: 'commented' }, // Charlie (no change)
        ],
        comments: [
            {
                id: '1',
                author: users[2],
                content: 'This looks good, but please add a unit test.',
                createdAt: '2024-08-30T14:20:00Z',
                lineNumber: 25
            }
        ],
      },
      {
        id: '1-2',
        name: 'Security Check',
        repositoryUrl: 'https://github.com/example/project/pull/123',
        assignments: [
          { reviewer: users[0], status: 'lgtm' }, // Alice (was pending -> lgtm)
          { reviewer: users[4], status: 'pending' }, // Eve (no change)
        ],
        comments: [],
      }
    ],
    activityLogs: [
        {
            id: 'log-1-1',
            type: 'CREATE',
            user: users[0],
            details: 'レビュー依頼が作成されました。',
            createdAt: '2024-08-30T10:00:00Z',
        }
    ]
  },
  {
    id: '2',
    title: '修正: モバイル版ログインボタンの配置問題',
    author: users[1], // Bob
    createdAt: '2024-08-29T15:30:00Z',
    stages: [
      {
        id: '2-1',
        name: 'Code Review',
        repositoryUrl: 'https://github.com/example/project/pull/120',
        assignments: [
          { reviewer: users[0], status: 'pending' }, // Alice (no change)
          { reviewer: users[3], status: 'lgtm' }, // David (was approved) LGTM
        ],
        comments: [],
      },
    ],
    activityLogs: [
        {
            id: 'log-2-1',
            type: 'CREATE',
            user: users[1],
            details: 'レビュー依頼が作成されました。',
            createdAt: '2024-08-29T15:30:00Z',
        }
    ]
  },
  {
    id: '3',
    title: 'リファクタ: データベース接続モジュール',
    author: users[2], // Charlie
    createdAt: '2024-08-28T09:00:00Z',
    stages: [
      {
        id: '3-1',
        name: 'Peer Review',
        repositoryUrl: 'https://github.com/example/project/pull/115',
        assignments: [
          { reviewer: users[1], status: 'lgtm' }, // Bob (was approved) LGTM
        ],
        comments: [],
      },
      {
        id: '3-2',
        name: 'Lead Review',
        repositoryUrl: 'https://github.com/example/project/pull/115',
        assignments: [
          { reviewer: users[0], status: 'commented' }, // Alice (no change)
        ],
        comments: [],
      },
      {
        id: '3-3',
        name: 'QA',
        repositoryUrl: 'https://github.com/example/project/pull/115',
        assignments: [
          { reviewer: users[4], status: 'pending' }, // Eve (no change)
        ],
        comments: [],
      },
    ],
    activityLogs: [
        {
            id: 'log-3-1',
            type: 'CREATE',
            user: users[2],
            details: 'レビュー依頼が作成されました。',
            createdAt: '2024-08-28T09:00:00Z',
        }
    ]
  },
  {
    id: '4',
    title: 'ドキュメント: APIドキュメントv2更新',
    author: users[3], // David
    createdAt: '2024-08-27T18:00:00Z',
    stages: [
      {
        id: '4-1',
        name: 'Review',
        repositoryUrl: 'https://github.com/example/project/pull/111',
        assignments: [],
        comments: [],
      },
    ],
    activityLogs: [
        {
            id: 'log-4-1',
            type: 'CREATE',
            user: users[3],
            details: 'レビュー依頼が作成されました。',
            createdAt: '2024-08-27T18:00:00Z',
        }
    ]
  },
];

export interface StageTemplate {
  id: string;
  name: string;
  stages: {
    name: string;
    reviewerIds: string[]; // Store reviewer IDs for template
  }[];
}

export let stageTemplates: StageTemplate[] = [
  {
    id: 'template-1',
    name: '標準レビュー (1st Round, Security)',
    stages: [
      { name: '1st Round', reviewerIds: [] },
      { name: 'Security Check', reviewerIds: [] },
    ],
  },
  {
    id: 'template-2',
    name: 'QAレビュー (QA, Final Check)',
    stages: [
      { name: 'QA', reviewerIds: [] },
      { name: 'Final Check', reviewerIds: [] },
    ],
  },
];
