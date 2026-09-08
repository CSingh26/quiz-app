import type { toast } from "react-toastify";
export type Toast = typeof toast;
export interface Router { push: (href: string) => void }
export interface Question { id: string; text: string; options: { id: string; text: string; label?: string }[] }
export interface StudentProfile { name: string; username: string; email: string; avatar?: string | null; background?: string | null }
export interface ProfileForm { name: string; username: string; email: string; avatar: File | null; background: File | null }
export interface PastRoomSummary { roomName: string; moduleName: string; maxScore: number; meanScore: number; minScore: number }
