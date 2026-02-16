
import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
};

export const BentoSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <Skeleton className="h-48 col-span-2" />
    <Skeleton className="h-48" />
    <Skeleton className="h-48" />
    <Skeleton className="h-64 col-span-3" />
    <Skeleton className="h-64" />
  </div>
);

export default Skeleton;
