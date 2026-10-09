'use client';
import { createContext, useContext } from 'react';

export type Profile = { id: string; full_name: string; role: 'admin' | 'guru' };
export const ProfileCtx = createContext<{ profile: Profile | null }>({ profile: null });
export const useProfile = () => useContext(ProfileCtx);
