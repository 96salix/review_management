import { User, ReviewRequest } from './types';

export const users: User[] = [
  { id: '1', name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?u=alice' },
  { id: '2', name: 'Bob', avatarUrl: 'https://i.pravatar.cc/150?u=bob' },
  { id: '3', name: 'Charlie', avatarUrl: 'https://i.pravatar.cc/150?u=charlie' },
  { id: '4', name: 'David', avatarUrl: 'https://i.pravatar.cc/150?u=david' },
  { id: '5', name: 'Eve', avatarUrl: 'https://i.pravatar.cc/150?u=eve' },
];

export let reviews: ReviewRequest[] = [
  {
    id: '1',
    title: '[WIP] Feature: Real-time collaboration',
    author: users[0], // Alice
    createdAt: '2024-08-30T10:00:00Z',
    stages: [
      {
        id: '1-1',
        name: '1st Round',
        repositoryUrl: 'https://github.com/example/project/pull/123',
        assignments: [
          { reviewer: users[1], status: 'approved' }, // Bob
          { reviewer: users[2], status: 'commented' }, // Charlie
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
          { reviewer: users[0], status: 'reviewing' }, // Alice
          { reviewer: users[4], status: 'pending' }, // Eve
        ],
        comments: [],
      }
    ],
  },
  {
    id: '2',
    title: 'Fix: Login button alignment issue on mobile',
    author: users[1], // Bob
    createdAt: '2024-08-29T15:30:00Z',
    stages: [
      {
        id: '2-1',
        name: 'Code Review',
        repositoryUrl: 'https://github.com/example/project/pull/120',
        assignments: [
          { reviewer: users[0], status: 'pending' }, // Alice
          { reviewer: users[3], status: 'approved' }, // David
        ],
        comments: [],
      },
    ],
  },
  {
    id: '3',
    title: 'Refactor: Database connection module',
    author: users[2], // Charlie
    createdAt: '2024-08-28T09:00:00Z',
    stages: [
      {
        id: '3-1',
        name: 'Peer Review',
        repositoryUrl: 'https://github.com/example/project/pull/115',
        assignments: [
          { reviewer: users[1], status: 'approved' }, // Bob
        ],
        comments: [],
      },
      {
        id: '3-2',
        name: 'Lead Review',
        repositoryUrl: 'https://github.com/example/project/pull/115',
        assignments: [
          { reviewer: users[0], status: 'commented' }, // Alice
        ],
        comments: [],
      },
      {
        id: '3-3',
        name: 'QA',
        repositoryUrl: 'https://github.com/example/project/pull/115',
        assignments: [
          { reviewer: users[4], status: 'pending' }, // Eve
        ],
        comments: [],
      },
    ],
  },
  {
    id: '4',
    title: 'Docs: Update API documentation for v2',
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
  },
];
