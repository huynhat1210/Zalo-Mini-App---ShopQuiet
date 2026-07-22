import React from "react";
import { IProductGridSkeletonProps } from "./skeleton.type";

export const BannerSkeleton: React.FC = () => {
  return (
    <div className="mx-6 my-4 rounded-3xl overflow-hidden relative h-[220px] bg-neutral-200 animate-pulse flex items-center shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-300 via-neutral-200 to-transparent"></div>
    </div>
  );
};

export const CategorySkeleton: React.FC = () => {
  return (
    <div className="flex gap-2.5 overflow-x-hidden pl-6 pr-6 py-1 w-full">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="px-5 py-2.5 rounded-full bg-neutral-200 animate-pulse w-24 h-9 shrink-0"
        ></div>
      ))}
    </div>
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col space-y-2.5">
      {/* Image Skeleton */}
      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-neutral-200 animate-pulse">
        <div className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white/50"></div>
      </div>

      {/* Text Skeleton */}
      <div className="px-1 flex flex-col space-y-2">
        <div className="h-2.5 bg-neutral-200 rounded animate-pulse w-1/3"></div>
        <div className="h-3.5 bg-neutral-200 rounded animate-pulse w-3/4"></div>
        <div className="flex justify-between items-center mt-1">
          <div className="h-3 bg-neutral-200 rounded animate-pulse w-1/4"></div>
          <div className="w-7 h-7 rounded-full bg-neutral-200 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export const ProductGridSkeleton: React.FC<IProductGridSkeletonProps> = (
  props,
) => {
  const { count = 4 } = props;
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-7 px-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};
