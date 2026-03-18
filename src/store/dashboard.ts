import { create } from 'zustand';

// Simple store that mimics the dashboard store
interface DashboardState {
  selectedAgentId: string | null;
  setSelectedAgent: (id: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedAgentId: null,
  setSelectedAgent: (id) => set({ selectedAgentId: id }),
}));