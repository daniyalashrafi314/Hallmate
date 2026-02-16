
import React from 'react';
import { 
  Home, 
  Users, 
  CreditCard, 
  Settings, 
  FileText, 
  UserPlus, 
  Megaphone, 
  Calendar,
  Grid,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const THEME_CONFIG = {
  STUDENT: {
    primary: 'bg-[#780000]',
    secondary: 'bg-[#9D0910]',
    text: 'text-[#780000]',
    border: 'border-[#780000]',
    bg: 'bg-[#FDF0D5]',
    accent: 'bg-[#c1121f]',
    hover: 'hover:bg-[#5e0000]'
  },
  STAFF: {
    primary: 'bg-[#003049]',
    secondary: 'bg-[#336683]',
    text: 'text-[#003049]',
    border: 'border-[#003049]',
    bg: 'bg-[#F0F4F8]',
    accent: 'bg-[#669bbc]',
    hover: 'hover:bg-[#00223a]'
  },
  PROVOST: {
    primary: 'bg-[#003049]',
    secondary: 'bg-[#336683]',
    text: 'text-[#003049]',
    border: 'border-[#003049]',
    bg: 'bg-[#F0F4F8]',
    accent: 'bg-[#669bbc]',
    hover: 'hover:bg-[#00223a]'
  }
};

export const MOCK_USER: any = {
  STUDENT: { id: '230101', name: 'Ariful Islam', email: 'arif@du.ac.bd', role: 'STUDENT', admissionYear: '2023', dept: 'CSE', room: '304-A' },
  STAFF: { id: 'S-992', name: 'Jannat Begum', email: 'jannat.hms@du.ac.bd', role: 'STAFF' },
  PROVOST: { id: 'P-001', name: 'Dr. Rafiqul Huq', email: 'rafiqul@du.ac.bd', role: 'PROVOST' }
};
