import { create } from "zustand";

export const useSaveStatusStore = create<{
  isPending: boolean;
  setPending: (isPending: boolean) => void;
}>((set) => ({
  isPending: false,
  setPending: (isPending) => set({ isPending }),
}));
