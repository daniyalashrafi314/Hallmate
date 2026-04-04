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
    primary: 'bg-[#2D6A4F]',    // Forest Green
    secondary: 'bg-[#40916C]',  // Sea Green
    text: 'text-[#1B4332]',     // Deepest Forest (High contrast)
    border: 'border-[#2D6A4F]', // Solid definition
    bg: 'bg-[#B7E4C7]',         // Light Mint
    accent: 'bg-[#6BB38F]',     // Fresh Accent
    hover: 'hover:bg-[#1B4332]' // Darker shade for interaction
  },
  SUPER_USER: {
    primary: 'bg-[#2D6A4F]',    // Forest Green
    secondary: 'bg-[#40916C]',  // Sea Green
    text: 'text-[#1B4332]',     // Deepest Forest (High contrast)
    border: 'border-[#2D6A4F]', // Solid definition
    bg: 'bg-[#B7E4C7]',         // Light Mint
    accent: 'bg-[#6BB38F]',     // Fresh Accent
    hover: 'hover:bg-[#1B4332]' // Darker shade for interaction
  }
};

export const MOCK_USER: any = {
  STUDENT: { id: '2305108', name: 'Ariful Islam', email: 'arif@du.ac.bd', role: 'STUDENT', admissionYear: '2023', dept: 'CSE', room: '304-A' },
  STAFF: { id: 'S-992', name: 'Jannat Begum', email: 'jannat.hms@du.ac.bd', role: 'STAFF' },
  PROVOST: { id: 'P-001', name: 'Dr. Rafiqul Huq', email: 'rafiqul@du.ac.bd', role: 'PROVOST' }
};
