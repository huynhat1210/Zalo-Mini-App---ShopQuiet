import React, { useState, useEffect } from "react";
import { Page } from "zmp-ui";
import { IMembershipCardProps } from "./membership-card.type";
import { apiRequest } from "../../utils/api";

const PageCast = Page as any;

export const MembershipCard: React.FC<IMembershipCardProps> = (props) => {
  const { zaloUser, setActiveTab } = props;
  const [showRankingInfo, setShowRankingInfo] = useState(false);
  const [privileges, setPrivileges] = useState<Record<string, any[]>>({});
  const [tierBenefits, setTierBenefits] = useState<{
    tier: string;
    discountPercentage: number;
    freeShippingThreshold: number;
    pointsMultiplier: number;
  } | null>(null);

  // Dynamic membership ranking calculations
  const totalSpent = zaloUser?.totalSpent || 0;
  const currentTier = zaloUser?.membershipTier || "Đồng";

  // Fetch membership privileges from backend
  useEffect(() => {
    const fetchPrivileges = async () => {
      const tiers = ["Đồng", "Bạc", "Vàng", "Kim cương"];
      const privilegesData: Record<string, any[]> = {};

      for (const tier of tiers) {
        try {
          const data = await apiRequest<any[]>(
            `/users/membership-privileges/${encodeURIComponent(tier)}`,
            "GET",
          );
          privilegesData[tier] = data || [];
        } catch (e) {
          console.error(`Failed to fetch privileges for tier ${tier}:`, e);
          privilegesData[tier] = [];
        }
      }

      setPrivileges(privilegesData);
    };

    fetchPrivileges();
  }, []);

  // Fetch tier benefits
  useEffect(() => {
    const fetchTierBenefits = async () => {
      try {
        const benefits = await apiRequest<{
          tier: string;
          discountPercentage: number;
          freeShippingThreshold: number;
          pointsMultiplier: number;
        }>("/users/tier-benefits");
        setTierBenefits(benefits);
      } catch (e) {
        console.error("Failed to fetch tier benefits:", e);
      }
    };
    fetchTierBenefits();
  }, [zaloUser?.id]);

  let nextTier = "";
  let nextGoal = 0;
  let tierBadge = "ĐỒNG";
  let badgeColor = "bg-neutral-400 text-white"; // Bronze

  if (currentTier === "Kim cương") {
    tierBadge = "KIM CƯƠNG";
    badgeColor = "bg-cyan-400 text-teal-950";
  } else if (currentTier === "Vàng") {
    tierBadge = "VÀNG";
    badgeColor = "bg-yellow-400 text-teal-950";
    nextTier = "Kim cương";
    nextGoal = 50000000;
  } else if (currentTier === "Bạc") {
    tierBadge = "BẠC";
    badgeColor = "bg-slate-300 text-teal-950";
    nextTier = "Vàng";
    nextGoal = 10000000;
  } else {
    tierBadge = "ĐỒNG";
    badgeColor = "bg-amber-600 text-white";
    nextTier = "Bạc";
    nextGoal = 2000000;
  }

  const remaining = nextGoal > 0 ? Math.max(0, nextGoal - totalSpent) : 0;
  const progressPercent =
    nextGoal > 0 ? Math.min(100, (totalSpent / nextGoal) * 100) : 100;

  const profile = {
    name: zaloUser?.name || "",
    avatar: zaloUser?.avatar || "",
  };

  return (
    <PageCast className="bg-[#f7f7f7] relative flex flex-col w-full h-full overscroll-none scrollbar-none animate-fade-in text-left">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-[#f0edeb] sticky top-0 z-30 shadow-xs">
        <button
          onClick={() => setActiveTab("profile")}
          className="p-1.5 -ml-1.5 hover:bg-[#f0edeb] rounded-full transition-colors border-none bg-transparent cursor-pointer"
        >
          <svg
            className="w-5.5 h-5.5 text-textColor"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-textColor">
          Hạng thành viên
        </span>
        <button
          onClick={() => setShowRankingInfo(true)}
          className="p-1.5 -mr-1.5 hover:bg-[#f0edeb] rounded-full transition-colors border-none bg-transparent cursor-pointer relative"
        >
          <svg
            className="w-5.5 h-5.5 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
        </button>
      </div>

      {/* Info Explanatory Overlay if open */}
      {showRankingInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-6"
          onClick={() => setShowRankingInfo(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 border border-[#f0edeb] shadow-2xl max-w-xs space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
              <span>Quy chế hoạt động</span>
            </div>
            <p className="text-xs text-textColor leading-relaxed font-medium">
              Hạng thành viên được tự động nâng cấp dựa trên tổng chi tiêu tích
              lũy của bạn tại hệ thống ShopQuiet.
            </p>
            <p className="text-xs text-textColor leading-relaxed font-medium">
              Mỗi khi hoàn thành một đơn hàng, giá trị đơn hàng sẽ được cộng
              trực tiếp vào tổng chi tiêu tích lũy của bạn để xét hạng.
            </p>
            <button
              onClick={() => setShowRankingInfo(false)}
              className="w-full h-9 bg-primary text-white text-[11px] font-bold uppercase tracking-wider rounded-xl border-none cursor-pointer active:scale-95 transition-all"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-5.5 space-y-6 pb-28">
        {/* User Current Tier Status Card */}
        <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-primary text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />

          <div className="flex items-center gap-4 relative z-10">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-14 h-14 rounded-full border-2 border-white/80 object-cover shadow-sm"
            />
            <div className="flex-1 text-left space-y-0.5">
              <p className="text-xs font-semibold text-white/70">
                Thành viên hiện tại
              </p>
              <h3 className="text-base font-bold tracking-tight">
                {profile.name}
              </h3>
              <span
                className={`inline-block mt-1 font-black text-[9px] uppercase px-2.5 py-0.5 rounded shadow-xs ${badgeColor}`}
              >
                ★ {tierBadge}
              </span>
            </div>
          </div>

          {/* Spent progress bar */}
          <div className="mt-5 space-y-1.5 relative z-10 text-left">
            <div className="flex justify-between items-center text-[10px] text-white/85 font-medium">
              <span>Chi tiêu: {totalSpent.toLocaleString("vi-VN")} đ</span>
              {nextGoal > 0 ? (
                <span>
                  Mục tiêu {nextTier}: {nextGoal.toLocaleString("vi-VN")} đ
                </span>
              ) : (
                <span>Đã đạt hạng cao nhất!</span>
              )}
            </div>
            <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            {nextGoal > 0 ? (
              <p className="text-[10px] text-white/70 italic text-center mt-1">
                Cần mua thêm {remaining.toLocaleString("vi-VN")} đ để lên hạng{" "}
                {nextTier}
              </p>
            ) : (
              <p className="text-[10px] text-white/70 italic text-center mt-1">
                Bạn đã đạt hạng thành viên cao nhất tại ShopQuiet
              </p>
            )}
          </div>

          {/* Tier Benefits Summary */}
          {tierBenefits && (
            <div className="mt-4 pt-4 border-t border-white/20 relative z-10">
              <p className="text-[9px] font-bold text-white/90 uppercase tracking-wider mb-2">
                Đặc quyền hiện tại:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-amber-300">
                    {tierBenefits.discountPercentage}%
                  </p>
                  <p className="text-[8px] text-white/70">Giảm giá</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-amber-300">
                    {tierBenefits.freeShippingThreshold === 0
                      ? "Miễn phí"
                      : tierBenefits.freeShippingThreshold.toLocaleString(
                          "vi-VN",
                        ) + "đ"}
                  </p>
                  <p className="text-[8px] text-white/70">Freeship từ</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-amber-300">
                    x{tierBenefits.pointsMultiplier}
                  </p>
                  <p className="text-[8px] text-white/70">Điểm thưởng</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Member tiers list */}
        <div className="space-y-4 text-left">
          <h3 className="text-[10px] font-extrabold text-[#526069]/55 uppercase tracking-widest pl-1">
            Danh sách phân hạng
          </h3>
          {[
            {
              level: "Đồng",
              badge: "🥉",
              min: "0đ",
              max: "1.999.999đ",
              current: currentTier === "Đồng",
            },
            {
              level: "Bạc",
              badge: "🥈",
              min: "2.000.000đ",
              max: "9.999.999đ",
              current: currentTier === "Bạc",
            },
            {
              level: "Vàng",
              badge: "🥇",
              min: "10.000.000đ",
              max: "49.999.999đ",
              current: currentTier === "Vàng",
            },
            {
              level: "Kim cương",
              badge: "💎",
              min: "50.000.000đ",
              max: "Không giới hạn",
              current: currentTier === "Kim cương",
            },
          ].map((tier) => (
            <div
              key={tier.level}
              className={`border rounded-2xl p-4.5 space-y-3 bg-white relative transition-all shadow-xs ${tier.current ? "ring-2 ring-primary ring-offset-2" : ""}`}
            >
              {tier.current && (
                <span className="absolute top-4 right-4 bg-primary text-white font-extrabold text-[8px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                  Hạng hiện tại
                </span>
              )}
              <div className="flex justify-between items-center pb-2 border-b border-[#f0edeb]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{tier.badge}</span>
                  <div>
                    <p className="font-bold text-xs text-textColor">
                      Hạng {tier.level}
                    </p>
                    <p className="text-[10px] text-textColor-variant/70 mt-0.5">
                      Yêu cầu tích lũy: {tier.min} – {tier.max}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-extrabold text-[#526069]/55 uppercase tracking-widest">
                  Đặc quyền nhận được:
                </p>
                <ul className="grid grid-cols-1 gap-2">
                  {privileges[tier.level]?.length > 0 ? (
                    privileges[tier.level].map((privilege: any) => (
                      <li
                        key={privilege.id}
                        className="text-xs text-textColor-variant flex items-center gap-2"
                      >
                        <span className="text-sm">{privilege.icon}</span>
                        <div className="flex-1">
                          <span className="font-medium">{privilege.title}</span>
                          <p className="text-[9px] text-textColor-variant/70 mt-0.5">
                            {privilege.description}
                          </p>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-textColor-variant/70 italic">
                      Đang tải đặc quyền...
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageCast>
  );
};
export default MembershipCard;
