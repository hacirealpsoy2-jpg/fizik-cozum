export interface PhysicsSolution {
  konu: string;
  istenilen: string;
  verilenler: string;
  cozum: string;
  sonuc: string;
  konuOzet: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export interface User {
  username: string;
  role: UserRole;
  isBanned: boolean;
  registrationDate: string;
  sessionLimitMinutes?: number; // Kişiye özel süre sınırı (Opsiyonel)
}

export interface Feedback {
  id: string;
  userQuestion: string;
  aiResponse: PhysicsSolution;
  adminCorrection?: string;
  status: 'pending' | 'reviewed';
}

export interface VerifiedExample {
  question: string;
  correctSolution: string; // Adminin düzelttiği metin formatındaki çözüm
}