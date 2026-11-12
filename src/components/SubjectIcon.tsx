import React from 'react';
import {
  FlaskConical,
  Droplets,
  Microscope,
  ShieldCheck,
  HeartPulse,
  TestTubes,
  Dna,
  ClipboardCheck,
  BookOpen,
  Layers,
  Activity,
  Bug,
  Cpu,
  BarChart3,
  Users,
  Pill,
  Scale,
  Award,
  FileText,
  Sparkles,
  type LucideProps,
} from 'lucide-react';

export const SUBJECT_ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  FlaskConical,
  Droplets,
  Microscope,
  ShieldCheck,
  HeartPulse,
  TestTubes,
  Dna,
  ClipboardCheck,
  BookOpen,
  Layers,
  Activity,
  Bug,
  Cpu,
  BarChart3,
  Users,
  Pill,
  Scale,
  Award,
  FileText,
  Sparkles,
};

export function getSubjectIconComponent(subjectNameOrIcon?: string): React.ComponentType<LucideProps> {
  if (!subjectNameOrIcon) return BookOpen;

  // Direct match by icon identifier
  if (SUBJECT_ICON_MAP[subjectNameOrIcon]) {
    return SUBJECT_ICON_MAP[subjectNameOrIcon];
  }

  const s = subjectNameOrIcon.toLowerCase();
  if (s.includes('parasit')) return Bug;
  if (s.includes('microbiol') || s.includes('micro')) return Microscope;
  if (s.includes('biochem') || s.includes('chem')) return FlaskConical;
  if (s.includes('hema') || s.includes('blood')) return Droplets;
  if (s.includes('histo') || s.includes('cyto')) return Layers;
  if (s.includes('anat') || s.includes('physio')) return Activity;
  if (s.includes('pathol') || s.includes('fluid') || s.includes('urine')) return TestTubes;
  if (s.includes('immuno') || s.includes('sero')) return ShieldCheck;
  if (s.includes('mgmt') || s.includes('qms') || s.includes('operat') || s.includes('qa') || s.includes('quality')) {
    return ClipboardCheck;
  }
  if (s.includes('instrument') || s.includes('automat')) return Cpu;
  if (s.includes('research') || s.includes('biostat') || s.includes('stat')) return BarChart3;
  if (s.includes('public health')) return Users;
  if (s.includes('pharm')) return Pill;
  if (s.includes('policy')) return FileText;
  if (s.includes('nhpc') || s.includes('ethic')) return Award;
  if (s.includes('mol') || s.includes('dna')) return Dna;

  return BookOpen;
}

export function getSubjectColorClasses(subjectName?: string): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconColor: string;
} {
  const s = (subjectName || '').toLowerCase();

  if (s.includes('parasit')) {
    return {
      badgeBg: 'bg-lime-50',
      badgeText: 'text-lime-800',
      badgeBorder: 'border-lime-200/80',
      iconBg: 'bg-lime-100/70',
      iconColor: 'text-lime-700',
    };
  }
  if (s.includes('microbiol') || s.includes('micro')) {
    return {
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-200/80',
      iconBg: 'bg-emerald-100/70',
      iconColor: 'text-emerald-700',
    };
  }
  if (s.includes('biochem') || s.includes('chem')) {
    return {
      badgeBg: 'bg-cyan-50',
      badgeText: 'text-cyan-800',
      badgeBorder: 'border-cyan-200/80',
      iconBg: 'bg-cyan-100/70',
      iconColor: 'text-cyan-700',
    };
  }
  if (s.includes('hema') || s.includes('blood')) {
    return {
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-200/80',
      iconBg: 'bg-rose-100/70',
      iconColor: 'text-rose-700',
    };
  }
  if (s.includes('histo') || s.includes('cyto')) {
    return {
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-800',
      badgeBorder: 'border-purple-200/80',
      iconBg: 'bg-purple-100/70',
      iconColor: 'text-purple-700',
    };
  }
  if (s.includes('anat') || s.includes('physio')) {
    return {
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-800',
      badgeBorder: 'border-orange-200/80',
      iconBg: 'bg-orange-100/70',
      iconColor: 'text-orange-700',
    };
  }
  if (s.includes('pathol') || s.includes('fluid') || s.includes('urine')) {
    return {
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200/80',
      iconBg: 'bg-amber-100/70',
      iconColor: 'text-amber-700',
    };
  }
  if (s.includes('immuno') || s.includes('sero')) {
    return {
      badgeBg: 'bg-violet-50',
      badgeText: 'text-violet-800',
      badgeBorder: 'border-violet-200/80',
      iconBg: 'bg-violet-100/70',
      iconColor: 'text-violet-700',
    };
  }
  if (s.includes('mgmt') || s.includes('qms') || s.includes('operat') || s.includes('qa') || s.includes('quality')) {
    return {
      badgeBg: 'bg-teal-50',
      badgeText: 'text-teal-800',
      badgeBorder: 'border-teal-200/80',
      iconBg: 'bg-teal-100/70',
      iconColor: 'text-teal-700',
    };
  }
  if (s.includes('instrument') || s.includes('automat')) {
    return {
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-800',
      badgeBorder: 'border-sky-200/80',
      iconBg: 'bg-sky-100/70',
      iconColor: 'text-sky-700',
    };
  }
  if (s.includes('research') || s.includes('biostat') || s.includes('stat')) {
    return {
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-800',
      badgeBorder: 'border-indigo-200/80',
      iconBg: 'bg-indigo-100/70',
      iconColor: 'text-indigo-700',
    };
  }
  if (s.includes('public health')) {
    return {
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-800',
      badgeBorder: 'border-blue-200/80',
      iconBg: 'bg-blue-100/70',
      iconColor: 'text-blue-700',
    };
  }
  if (s.includes('pharm')) {
    return {
      badgeBg: 'bg-pink-50',
      badgeText: 'text-pink-800',
      badgeBorder: 'border-pink-200/80',
      iconBg: 'bg-pink-100/70',
      iconColor: 'text-pink-700',
    };
  }
  if (s.includes('policy')) {
    return {
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-800',
      badgeBorder: 'border-slate-300/80',
      iconBg: 'bg-slate-200/70',
      iconColor: 'text-slate-700',
    };
  }
  if (s.includes('nhpc') || s.includes('ethic')) {
    return {
      badgeBg: 'bg-yellow-50',
      badgeText: 'text-yellow-800',
      badgeBorder: 'border-yellow-200/80',
      iconBg: 'bg-yellow-100/70',
      iconColor: 'text-yellow-700',
    };
  }
  if (s.includes('mol') || s.includes('dna')) {
    return {
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-800',
      badgeBorder: 'border-indigo-200/80',
      iconBg: 'bg-indigo-100/70',
      iconColor: 'text-indigo-700',
    };
  }

  return {
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-200/80',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
  };
}

interface SubjectIconProps extends LucideProps {
  name?: string;
  icon?: string;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ name, icon, ...props }) => {
  const IconComponent = getSubjectIconComponent(icon || name);
  return <IconComponent {...props} />;
};
