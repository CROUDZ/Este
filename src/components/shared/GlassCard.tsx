"use client";

import React from "react";
import { m } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: "sm" | "md" | "lg";
  onClick?: () => void;
}

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconColor?: string;
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  hoverable = false,
  padding = "md",
  onClick,
}) => {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  if (hoverable) {
    return (
      <m.div
        className={`glass-card ${paddingClasses[padding]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={onClick}
      >
        {children}
      </m.div>
    );
  }

  return (
    <div 
      className={`glass-card ${paddingClasses[padding]} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  iconColor = "text-cyan-400",
  hoverable = true,
}) => {
  return (
    <GlassCard hoverable={hoverable}>
      <div className="text-center">
        <Icon className={`w-8 h-8 ${iconColor} mx-auto mb-3`} />
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
      </div>
    </GlassCard>
  );
};
