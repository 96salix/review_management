import { User, ReviewRequest } from './types';

export const users: User[] = [
  { id: '1', name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?u=alice' },
  { id: '2', name: 'Bob', avatarUrl: 'https://i.pravatar.cc/150?u=bob' },
  { id: '3', name: 'Charlie', avatarUrl: 'https://i.pravatar.cc/150?u=charlie' },
];

export let reviews: ReviewRequest[] = [
  {
    id: '1',
    title: 'Implement feature-x',
    author: users[0],
    createdAt: '2024-08-30T10:00:00Z',
    stages: [
      {
        id: '1-1',
        name: '1st Round',
        repositoryUrl: 'https://github.com/example/project/pull/123',
        assignments: [
          { reviewer: users[1], status: 'approved' },
          { reviewer: users[2], status: 'commented' },
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
          { reviewer: users[0], status: 'pending' },
        ],
        comments: [],
      }
    ],
  },
];
