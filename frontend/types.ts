
export enum UserRole {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  PROVOST = 'PROVOST'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  admissionYear?: string;
  dept?: string;
  room?: string;
}

export interface Payment {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Due';
}

export interface Visitor {
  id: string;
  name: string;
  relationship: string;
  date: string;
  time: string;
}

export interface ResidencyApplication {
  id: string;
  studentId: string;
  status: 'Pending' | 'Approved' | 'Denied';
  reasoning: string;
  priority?: number;
}

export interface Notice {
  id: string;
  title: string;
  date: string;
  description: string;
}

export interface Room {
  id: string;
  floor: number;
  seats: { id: string; studentId: string | null }[];
}
