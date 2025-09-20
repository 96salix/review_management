
import { User, StageTemplate, ReviewRequest, TemplateStage } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Users ---
export const users: User[] = [
  { id: 'user-1', name: 'Alice', avatarUrl: 'https://i.pravatar.cc/150?u=user-1' },
  { id: 'user-2', name: 'Bob', avatarUrl: 'https://i.pravatar.cc/150?u=user-2' },
  { id: 'user-3', name: 'Charlie', avatarUrl: 'https://i.pravatar.cc/150?u=user-3' },
  { id: 'user-4', name: 'David', avatarUrl: 'https://i.pravatar.cc/150?u=user-4' },
  { id: 'user-5', name: 'Eve', avatarUrl: 'https://i.pravatar.cc/150?u=user-5' },
];

// --- Stage Templates ---
const defaultTemplateStages: TemplateStage[] = [
    { name: '1st Review', reviewerIds: [], reviewerCount: 2, stage_order: 0 },
    { name: '2nd Review', reviewerIds: [], reviewerCount: 1, stage_order: 1 },
];

const frontendTemplateStages: TemplateStage[] = [
    { name: 'Design Review', reviewerIds: ['user-1', 'user-5'], reviewerCount: 2, stage_order: 0 },
    { name: 'Implementation Review', reviewerIds: ['user-2', 'user-3'], reviewerCount: 2, stage_order: 1 },
    { name: 'Final Check', reviewerIds: ['user-4'], reviewerCount: 1, stage_order: 2 },
];

export const stageTemplates: Omit<StageTemplate, 'id'>[] = [
  {
    name: 'Default Backend Template',
    stages: defaultTemplateStages,
    isDefault: true,
  },
  {
    name: 'Frontend Component Template',
    stages: frontendTemplateStages,
    isDefault: false,
  },
];

// --- Review Requests ---
// Note: We will create these programmatically in the seed script
// to handle dynamic IDs and relationships correctly.
