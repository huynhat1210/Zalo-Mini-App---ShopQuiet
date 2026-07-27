import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "zmp-sdk";
import { apiRequest } from "../../utils/api";
import { IAddressManagerProps } from "./address-manager.type";
import {
  getProvinces,
  getDistricts,
  getWards,
  parseAddressComponents,
} from "../../constants/vietnam-locations";

const profileAddressSchema = z.object({
  label: z.string().trim().min(2, "Vui lòng nhập tên nhãn"),
  phone: z
    .string()
    .trim()
    .min(9, "Số điện thoại không hợp lệ")
    .regex(/^[0-9]{9,11}$/, "Số điện thoại không hợp lệ"),
  houseNumber: z.string().trim().min(2, "Vui lòng nhập số nhà, tên đường"),
});

type ProfileAddressFormValues = z.infer<typeof profileAddressSchema>;

export const AddressManager: React.FC<IAddressManagerProps> = (props) => {
  const { isOpen, onClose, zaloUser, showToast } = props;
  const [addresses, setAddresses] = useState<any[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Vietnam Administrative Location States
  const provincesList = getProvinces();
  const [selectedProvince, setSelectedProvince] = useState<string>("TP. Hồ Chí Minh");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("Quận 1");
  const [selectedWard, setSelectedWard] = useState<string>("Phường Bến Nghé");

  const districtList = getDistricts(selectedProvince);
  const wardList = getWards(selectedProvince, selectedDistrict);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ProfileAddressFormValues>({
    resolver: zodResolver(profileAddressSchema),
    defaultValues: {
      label: "",
      phone: "",
      houseNumber: "",
    },
  });

  const processCoordsAndFillAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`,
        {
          headers: {
            "User-Agent": "ShopQuiet Zalo Mini App",
          },
        },
      );
      if (res.ok) {
        const resJson = await res.json();
        const address = resJson.address || {};
        const displayName = resJson.display_name || "";

        const city =
          address.city ||
          address.province ||
          address.state ||
          address.town ||
          "";
        const district =
          address.suburb || address.district || address.county || "";
        const street =
          address.road || address.suburb || address.quarter || "";
        const houseNumber = address.house_number || "";

        const parsedStreet = `${houseNumber} ${street} ${district}`
          .trim()
          .replace(/\s+/g, " ");

        if (city && provincesList.includes(city)) {
          setSelectedProvince(city);
        }

        reset({
          ...getValues(),
          houseNumber: parsedStreet || displayName,
        });
        showToast("Đã định vị vị trí GPS thành công!", "success");
      } else {
        showToast("Không thể giải mã tọa độ GPS!", "warning");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi phân tích địa chỉ GPS!", "warning");
    } finally {
      setLocating(false);
    }
  };

  const handleGetGPSLocation = () => {
    setLocating(true);

    // Primary: Standard HTML5 Geolocation API (Works on Web Browsers & Mobile WebViews)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          processCoordsAndFillAddress(pos.coords.latitude, pos.coords.longitude);
        },
        (_err) => {
          // Fallback: Zalo SDK
          if (api && api.getLocation) {
            api.getLocation({
              success: (data: any) => {
                const lat = data.latitude ?? data.lat;
                const lng = data.longitude ?? data.lon;
                if (lat && lng) {
                  processCoordsAndFillAddress(Number(lat), Number(lng));
                } else {
                  showToast("Không thể lấy vị trí từ thiết bị.", "warning");
                  setLocating(false);
                }
              },
              fail: () => {
                showToast("Vui lòng bật GPS trên thiết bị!", "warning");
                setLocating(false);
              },
            });
          } else {
            showToast("Vui lòng bật quyền định vị GPS trên trình duyệt!", "warning");
            setLocating(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else if (api && api.getLocation) {
      api.getLocation({
        success: (data: any) => {
          const lat = data.latitude ?? data.lat;
          const lng = data.longitude ?? data.lon;
          if (lat && lng) {
            processCoordsAndFillAddress(Number(lat), Number(lng));
          } else {
            showToast("Không thể lấy vị trí từ Zalo SDK.", "warning");
            setLocating(false);
          }
        },
        fail: () => {
          showToast("Không lấy được vị trí GPS.", "warning");
          setLocating(false);
        },
      });
    } else {
      showToast("Thiết bị không hỗ trợ định vị GPS.", "warning");
      setLocating(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const fetched = await apiRequest<any[]>("/addresses");
      setAddresses(fetched);
      const active = fetched.find((a) => a.isDefault) || fetched[0];
      if (active) {
        setActiveAddressId(active.id.toString());
        const userId = zaloUser?.id || "";
        if (userId) {
          localStorage.setItem(
            `shipping_address_${userId}`,
            JSON.stringify({
              name: zaloUser?.name || "",
              street: active.street,
              city: active.city,
              phone: active.phone,
            }),
          );
        }
      } else {
        setActiveAddressId("");
      }
    } catch (e) {
      console.error("Failed to fetch addresses:", e);
    }
  };

  useEffect(() => {
    if (isOpen && zaloUser?.id) {
      fetchAddresses();
    }
  }, [isOpen, zaloUser?.id]);

  useEffect(() => {
    if (!showAddForm) {
      reset({
        label: "",
        phone: "",
        houseNumber: "",
      });
      setEditingAddressId(null);
    }
  }, [showAddForm, reset]);

  const handleSelectAddress = async (id: number) => {
    try {
      await apiRequest(`/addresses/${id}/default`, "PATCH");
      await fetchAddresses();
      showToast("Đã đặt làm địa chỉ mặc định!", "success");
    } catch (e) {
      console.error(e);
      showToast("Không thể đặt làm địa chỉ mặc định!", "warning");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-[#f0edeb] shadow-2xl space-y-4 animate-scale-up">
        <div className="flex justify-between items-center pb-1">
          <h3 className="text-xs font-bold text-textColor uppercase tracking-wider">
            Sổ địa chỉ giao hàng
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer text-base leading-none font-bold"
          >
            ×
          </button>
        </div>

        {/* Addresses list */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {addresses.length === 0 ? (
            <div className="text-center py-6 text-[10px] text-textColor-variant">
              Chưa có địa chỉ nào. Vui lòng thêm mới!
            </div>
          ) : (
            addresses.map((addr) => (
              <div
                key={addr.id}
                onClick={() => handleSelectAddress(addr.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-start text-left ${
                  activeAddressId === addr.id.toString()
                    ? "border-primary bg-primary/5"
                    : "border-[#f0edeb] bg-white hover:bg-neutral-50"
                }`}
              >
                <div className="text-xs space-y-1.5 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-textColor">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="bg-primary text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-textColor-variant leading-relaxed">
                    {addr.street}, {addr.city}
                  </p>
                  <p className="text-textColor-variant/80 font-semibold">
                    SĐT: {addr.phone}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAddressId(addr.id);
                      const parsed = parseAddressComponents(addr.street || "", addr.city || "");
                      if (parsed.city && provincesList.includes(parsed.city)) {
                        setSelectedProvince(parsed.city);
                      }
                      if (parsed.district) setSelectedDistrict(parsed.district);
                      if (parsed.ward) setSelectedWard(parsed.ward);

                      reset({
                        label: addr.label || "",
                        phone: addr.phone || "",
                        houseNumber: parsed.houseNumber || addr.street || "",
                      });
                      setShowAddForm(true);
                    }}
                    className="text-primary hover:text-primary-dark p-1 border-none bg-transparent cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm("Bạn có muốn xóa địa chỉ này không?"))
                        return;
                      try {
                        await apiRequest(`/addresses/${addr.id}`, "DELETE");
                        await fetchAddresses();
                        showToast("Đã xóa địa chỉ!", "info");
                      } catch (err) {
                        showToast("Xóa địa chỉ thất bại!", "warning");
                      }
                    }}
                    className="text-red-500 hover:text-red-700 p-1 border-none bg-transparent cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add new address button/form */}
        {!showAddForm ? (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setEditingAddressId(null);
                reset({ label: "Nhà riêng", phone: zaloUser?.phone || "", houseNumber: "" });
                setShowAddForm(true);
              }}
              className="w-full h-10 border border-dashed border-primary/40 text-primary font-bold text-xs uppercase tracking-wider rounded-xl bg-transparent cursor-pointer hover:bg-primary/5 transition-all"
            >
              + Thêm địa chỉ mới
            </button>
            <button
              onClick={onClose}
              className="w-full h-10 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
            >
              Đóng
            </button>
          </div>
        ) : (
          <div className="border border-neutral-100 bg-neutral-50/50 p-4 rounded-2xl space-y-3 mt-2 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-1">
              <span className="text-[9px] font-extrabold text-[#526069]/70 uppercase tracking-widest">
                {editingAddressId ? "Chỉnh sửa địa chỉ" : "Địa chỉ mới"}
              </span>
              <button
                type="button"
                onClick={handleGetGPSLocation}
                disabled={locating}
                className="text-[9px] bg-primary/10 text-primary font-black uppercase px-2 py-1 rounded-md border-none cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
              >
                {locating ? "Đang định vị..." : "📍 Định vị GPS"}
              </button>
            </div>

            <div>
              <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                Tên nhãn địa chỉ
              </label>
              <input
                type="text"
                {...register("label")}
                placeholder="VD: Nhà riêng / Công ty"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-textColor font-semibold"
              />
              {errors.label && (
                <p className="mt-1 text-[10px] text-red-500">
                  {errors.label.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                Số điện thoại người nhận
              </label>
              <input
                type="text"
                {...register("phone")}
                placeholder="0987654321"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-textColor font-semibold"
              />
              {errors.phone && (
                <p className="mt-1 text-[10px] text-red-500">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Vietnam Administrative Location Dropdowns */}
            <div className="grid grid-cols-1 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                  Tỉnh / Thành phố
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    setSelectedProvince(newProv);
                    const dists = getDistricts(newProv);
                    if (dists.length > 0) {
                      setSelectedDistrict(dists[0]);
                      const wards = getWards(newProv, dists[0]);
                      if (wards.length > 0) setSelectedWard(wards[0]);
                    }
                  }}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-textColor font-semibold cursor-pointer"
                >
                  {provincesList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                  Quận / Huyện
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    setSelectedDistrict(newDist);
                    const wards = getWards(selectedProvince, newDist);
                    if (wards.length > 0) setSelectedWard(wards[0]);
                  }}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-textColor font-semibold cursor-pointer"
                >
                  {districtList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                  Phường / Xã
                </label>
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-textColor font-semibold cursor-pointer"
                >
                  {wardList.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                Số nhà, tên đường
              </label>
              <input
                type="text"
                {...register("houseNumber")}
                placeholder="VD: 123 Nguyễn Trãi"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-textColor font-semibold"
              />
              {errors.houseNumber && (
                <p className="mt-1 text-[10px] text-red-500">
                  {errors.houseNumber.message}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubmit(async (values) => {
                  const compiledStreet = `${values.houseNumber}, ${selectedWard}, ${selectedDistrict}`;
                  const compiledCity = selectedProvince;

                  try {
                    if (editingAddressId) {
                      await apiRequest(
                        `/addresses/${editingAddressId}`,
                        "PUT",
                        {
                          label: values.label,
                          phone: values.phone,
                          street: compiledStreet,
                          city: compiledCity,
                        },
                      );
                      await fetchAddresses();
                      setShowAddForm(false);
                      showToast("Đã cập nhật địa chỉ!", "success");
                    } else {
                      const saved = await apiRequest<any>(
                        "/addresses",
                        "POST",
                        {
                          label: values.label,
                          phone: values.phone,
                          street: compiledStreet,
                          city: compiledCity,
                          isDefault: addresses.length === 0,
                        },
                      );
                      if (saved) {
                        await fetchAddresses();
                        setShowAddForm(false);
                        reset({ label: "", phone: "", houseNumber: "" });
                        showToast("Đã thêm địa chỉ mới!", "success");
                      }
                    }
                  } catch (e) {
                    showToast(
                      editingAddressId
                        ? "Cập nhật địa chỉ thất bại!"
                        : "Thêm địa chỉ thất bại!",
                      "warning",
                    );
                  }
                })}
                className="flex-1 h-9 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-primary-dark"
              >
                {editingAddressId ? "Cập nhật" : "Lưu địa chỉ"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="h-9 px-4 bg-neutral-100 text-textColor font-bold text-xs uppercase tracking-wider rounded-xl border-none cursor-pointer hover:bg-neutral-200"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default AddressManager;
