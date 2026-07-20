import { useState, useRef, useEffect } from 'react';

interface PriceSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export const PriceSlider: React.FC<PriceSliderProps> = ({
  min,
  max,
  value,
  onChange
}) => {
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);
  const minValRef = useRef<HTMLInputElement>(null);
  const maxValRef = useRef<HTMLInputElement>(null);
  const range = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
  }, [value]);

  const getPercent = (value: number) => {
    return Math.round(((value - min) / (max - min)) * 100);
  };

  useEffect(() => {
    if (maxValRef.current) {
      const minPercent = getPercent(minVal);
      const maxPercent = getPercent(+maxValRef.current.value);

      if (range.current) {
        range.current.style.left = `${minPercent}%`;
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [minVal, max, min]);

  useEffect(() => {
    if (minValRef.current) {
      const minPercent = getPercent(+minValRef.current.value);
      const maxPercent = getPercent(maxVal);

      if (range.current) {
        range.current.style.width = `${maxPercent - minPercent}%`;
      }
    }
  }, [maxVal, max, min]);

  return (
    <div className="relative w-full h-6 flex items-center">
      <div className="relative w-full h-1.5 bg-neutral-200 rounded-full">
        <div
          ref={range}
          className="absolute h-1.5 bg-primary rounded-full"
          style={{ left: '0%', width: '100%' }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={minVal}
        ref={minValRef}
        onChange={(event) => {
          const value = Math.min(+event.target.value, maxVal - 100000);
          setMinVal(value);
          onChange([value, maxVal]);
        }}
        className="absolute w-full h-6 bg-transparent appearance-none cursor-pointer pointer-events-none z-10"
        style={{ pointerEvents: 'auto' }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={maxVal}
        ref={maxValRef}
        onChange={(event) => {
          const value = Math.max(+event.target.value, minVal + 100000);
          setMaxVal(value);
          onChange([minVal, value]);
        }}
        className="absolute w-full h-6 bg-transparent appearance-none cursor-pointer pointer-events-none z-10"
        style={{ pointerEvents: 'auto' }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          pointer-events: auto;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          background: #3b82f6;
        }
        input[type="range"]::-moz-range-thumb:hover {
          background: #3b82f6;
        }
      `}</style>
    </div>
  );
};
