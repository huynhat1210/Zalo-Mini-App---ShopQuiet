import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../../utils/api';
import { ILuckyWheelProps } from './lucky-wheel.type';

interface PrizeItem {
  code: string;
  name: string;
  value: number;
  type: string;
  color: string;
}

export const LuckyWheel: React.FC<ILuckyWheelProps> = (props) => {
  const { isOpen, onClose, zaloUser, showToast, onVoucherClaimed } = props;
  const [spinning, setSpinning] = useState(false);
  const [prizes, setPrizes] = useState<PrizeItem[]>([]);
  const [spinResult, setSpinResult] = useState<PrizeItem | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wheelDeg = useRef(0);

  const defaultPrizes: PrizeItem[] = [
    { code: 'FREESHIP', name: 'Miễn phí ship', value: 0, type: 'FREESHIP', color: '#0d9488' },
    { code: 'GIAM10K', name: 'Giảm 10.000đ', value: 10000, type: 'FIXED', color: '#eab308' },
    { code: 'GIAM20K', name: 'Giảm 20.000đ', value: 20000, type: 'FIXED', color: '#14b8a6' },
    { code: 'SHOPQUIET50', name: 'Giảm 50.000đ', value: 50000, type: 'FIXED', color: '#f97316' },
    { code: 'KM10PERCENT', name: 'Giảm 10%', value: 10, type: 'PERCENT', color: '#0f766e' },
    { code: 'LUCKYNEXT', name: 'Chúc may mắn', value: 0, type: 'LUCKY', color: '#64748b' },
  ];

  const checkSpinEligibility = (): { eligible: boolean; text: string } => {
    if (!zaloUser?.id) return { eligible: false, text: 'Vui lòng đăng nhập' };
    const lastSpinStr = localStorage.getItem(`lucky_wheel_last_spin_${zaloUser.id}`);
    if (lastSpinStr) {
      const lastSpin = parseInt(lastSpinStr, 10);
      const now = Date.now();
      const diff = now - lastSpin;
      const cooldown = 24 * 60 * 60 * 1000; // 24 hours
      if (diff < cooldown) {
        const remainingMs = cooldown - diff;
        const hours = Math.floor(remainingMs / (60 * 60 * 1000));
        const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        return { eligible: false, text: `Quay lại sau ${hours}h ${minutes}m` };
      }
    }
    return { eligible: true, text: 'QUAY NGAY!' };
  };

  const loadPrizes = async () => {
    try {
      const dbVouchers = await apiRequest<any[]>('/vouchers');
      if (dbVouchers && dbVouchers.length > 0) {
        // Map db vouchers, append Lucky item to fill at least 6 slices
        const mapped: PrizeItem[] = dbVouchers.slice(0, 5).map((v, idx) => ({
          code: v.code,
          name: v.type === 'PERCENT' ? `Giảm ${v.value}%` : v.type === 'FIXED' ? `Giảm ${(v.value/1000).toFixed(0)}K` : 'Freeship',
          value: v.value,
          type: v.type,
          color: idx % 2 === 0 ? '#0d9488' : '#eab308'
        }));
        if (mapped.length < 6) {
          mapped.push({ code: 'LUCKYNEXT', name: 'Chúc may mắn', value: 0, type: 'LUCKY', color: '#64748b' });
        }
        setPrizes(mapped);
      } else {
        setPrizes(defaultPrizes);
      }
    } catch {
      setPrizes(defaultPrizes);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPrizes();
      const eligibility = checkSpinEligibility();
      if (!eligibility.eligible) {
        setTimeLeft(eligibility.text);
      } else {
        setTimeLeft('QUAY NGAY!');
      }
    }
  }, [isOpen, zaloUser?.id]);

  // Draw wheel canvas
  useEffect(() => {
    if (prizes.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    ctx.clearRect(0, 0, width, height);

    const sliceAngle = (2 * Math.PI) / prizes.length;
    prizes.forEach((prize, index) => {
      const angle = index * sliceAngle;
      ctx.beginPath();
      ctx.fillStyle = prize.color;
      ctx.moveTo(center, center);
      ctx.arc(center, center, center - 10, angle, angle + sliceAngle);
      ctx.lineTo(center, center);
      ctx.fill();

      // Text drawing
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(prize.name, center - 25, 3);
      ctx.restore();
    });

    // Draw center pin
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(center, center, 20, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = '#115e59';
    ctx.arc(center, center, 14, 0, 2 * Math.PI);
    ctx.fill();
  }, [prizes]);

  const spinTheWheel = () => {
    if (spinning || prizes.length === 0) return;
    const eligibility = checkSpinEligibility();
    if (!eligibility.eligible) {
      showToast(eligibility.text, 'warning');
      return;
    }

    setSpinning(true);
    // Random select prize index
    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const selected = prizes[prizeIndex];

    let finalPrizeCode = selected.code;

    // Call backend API in parallel to generate the unique voucher and create user notification
    const callBackendPromise = (async () => {
      if (selected.type !== 'LUCKY' && zaloUser?.id) {
        try {
          const res = await apiRequest<any>('/vouchers/lucky-draw/generate', 'POST', {
            zaloUserId: zaloUser.id,
            rewardType: selected.type,
            rewardValue: selected.value,
            minOrderVal: 0
          });
          if (res && res.code) {
            finalPrizeCode = res.code;
          }
        } catch (e) {
          console.error('Failed to generate backend voucher:', e);
        }
      }
    })();

    const sliceAngle = 360 / prizes.length;
    // Calculate stop degree (stop inside the sliced arc)
    const targetDeg = 360 - (prizeIndex * sliceAngle + sliceAngle / 2);
    // Rotate multiple times for visual effect (3600 deg = 10 full spins)
    const totalRotation = 3600 + targetDeg;
    
    wheelDeg.current = totalRotation;
    if (canvasRef.current) {
      canvasRef.current.style.transition = 'transform 4s cubic-bezier(0.1, 0.8, 0.3, 1)';
      canvasRef.current.style.transform = `rotate(${totalRotation}deg)`;
    }

    setTimeout(async () => {
      // Wait for backend code generation API to resolve
      await callBackendPromise;

      setSpinning(false);
      const updatedSpinResult = {
        ...selected,
        code: finalPrizeCode
      };
      setSpinResult(updatedSpinResult);
      setShowResultModal(true);

      // Save spin timestamp
      if (zaloUser?.id) {
        localStorage.setItem(`lucky_wheel_last_spin_${zaloUser.id}`, Date.now().toString());
        // Save voucher to user's pocket local list to make sure they see it in Wallet
        if (selected.type !== 'LUCKY') {
          const storedClaimedStr = localStorage.getItem(`claimed_vouchers_${zaloUser.id}`) || '[]';
          const storedClaimed = JSON.parse(storedClaimedStr);
          if (!storedClaimed.includes(finalPrizeCode)) {
            storedClaimed.push(finalPrizeCode);
            localStorage.setItem(`claimed_vouchers_${zaloUser.id}`, JSON.stringify(storedClaimed));
          }
        }
      }

      // Check remaining eligibility time
      const nextEligibility = checkSpinEligibility();
      setTimeLeft(nextEligibility.text);

      if (onVoucherClaimed) onVoucherClaimed();
    }, 4100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in text-left">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl flex flex-col items-center space-y-5 animate-scale-up relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors border-none cursor-pointer flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-textColor" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <h3 className="text-sm font-extrabold text-textColor uppercase tracking-wider flex items-center gap-1.5 justify-center">🎡 Vòng quay may mắn</h3>
          <p className="text-[10px] text-textColor-variant mt-1">Quay thưởng nhận voucher mua sắm cực lớn hàng ngày!</p>
        </div>

        {/* Pin marker container */}
        <div className="relative w-64 h-64 flex items-center justify-center bg-neutral-50 rounded-full p-2 border border-[#f0edeb]">
          {/* Top pin indicator */}
          <div className="absolute top-0 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-red-500 z-20 drop-shadow-sm"></div>
          
          <canvas
            ref={canvasRef}
            width={240}
            height={240}
            className="w-full h-full rounded-full shadow-xs bg-white"
          />
        </div>

        <button
          onClick={spinTheWheel}
          disabled={spinning || timeLeft !== 'QUAY NGAY!'}
          className="w-full h-11 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-2xl border-none cursor-pointer hover:bg-primary-dark disabled:bg-slate-300 active:scale-95 transition-all shadow-md"
        >
          {spinning ? 'Đang quay...' : timeLeft}
        </button>

        {/* Spin Result Modal popup */}
        {showResultModal && spinResult && (
          <div className="fixed inset-0 z-[110] bg-black/35 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowResultModal(false)}>
            <div className="bg-white rounded-3xl p-6 border border-[#f0edeb] shadow-2xl max-w-[280px] w-full text-center space-y-4 animate-scale-up" onClick={e => e.stopPropagation()}>
              <span className="text-4xl block">
                {spinResult.type === 'LUCKY' ? '🍀' : '🎉'}
              </span>
              <div>
                <h4 className="text-xs font-black text-textColor uppercase tracking-wider">
                  {spinResult.type === 'LUCKY' ? 'Chúc may mắn lần sau!' : 'Trúng thưởng Voucher!'}
                </h4>
                <p className="text-[10.5px] text-textColor-variant mt-1.5 leading-relaxed">
                  {spinResult.type === 'LUCKY'
                    ? 'Hôm nay bạn chưa trúng thưởng rồi. Hãy quay lại vào ngày mai nhé!'
                    : `Chúc mừng bạn đã trúng mã: ${spinResult.code} (${spinResult.name})!`}
                </p>
              </div>

              {spinResult.type !== 'LUCKY' && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(spinResult.code).catch(() => {});
                    showToast(`Đã sao chép mã ${spinResult.code}!`, 'success');
                    setShowResultModal(false);
                  }}
                  className="w-full h-9 bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95"
                >
                  Sao chép mã & Đóng
                </button>
              )}
              
              {spinResult.type === 'LUCKY' && (
                <button
                  onClick={() => setShowResultModal(false)}
                  className="w-full h-9 bg-neutral-100 text-textColor text-[10px] font-bold uppercase tracking-wider rounded-xl border-none cursor-pointer"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default LuckyWheel;
