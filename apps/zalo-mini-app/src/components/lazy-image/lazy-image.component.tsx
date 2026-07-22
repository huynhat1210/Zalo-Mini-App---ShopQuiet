import React, { useState, useEffect, useRef } from "react";
import { ILazyImageComponentProps } from "./lazy-image.type";

export const LazyImageComponent: React.FC<ILazyImageComponentProps> = (
  props,
) => {
  const {
    src,
    alt,
    className = "",
    fallbackSrc = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  } = props;

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // If IntersectionObserver is not supported, fallback to immediate load
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px 0px", // start loading slightly before coming into view
      },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const hasAbsoluteOrFixed =
    className.includes("absolute") || className.includes("fixed");
  const positionClass = hasAbsoluteOrFixed ? "" : "relative";

  return (
    <div
      ref={imgRef}
      className={`${positionClass} overflow-hidden bg-slate-100 ${className}`}
    >
      {/* Shimmer loading placeholder */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse">
          {/* Shimmer gradient overlay */}
          <div
            className="w-full h-full bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>
      )}

      {/* Actual Image */}
      {shouldLoad && (
        <img
          src={error ? fallbackSrc : src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
};
