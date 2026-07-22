import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "zmp-sdk";
import { apiRequest } from "../../utils/api";
import { IAddressManagerProps } from "./address-manager.type";

const profileAddressSchema = z.object({
  label: z.string().trim().min(2, "Vui lòng nhập tên nhãn"),
  phone: z
    .string()
    .trim()
    .min(9, "Số điện thoại không hợp lệ")
    .regex(/^[0-9]{9,11}$/, "Số điện thoại không hợp lệ"),
  street: z.string().trim().min(5, "Vui lòng nhập địa chỉ chi tiết"),
  city: z.string().trim().min(2, "Vui lòng nhập tỉnh/thành phố"),
});

type ProfileAddressFormValues = z.infer<typeof profileAddressSchema>;

export const AddressManager: React.FC<IAddressManagerProps> = (props) => {
  const { isOpen, onClose, zaloUser, showToast } = props;
  const [addresses, setAddresses] = useState<any[]>([]);
  const [activeAddressId, setActiveAddressId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

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
      street: "",
      city: "",
    },
  });

  const handleGetGPSLocation = () => {
    setLocating(true);
    try {
      if (api && api.getLocation) {
        api.getLocation({
          success: async (data: any) => {
            const { latitude, longitude } = data;
            if (latitude && longitude) {
              try {
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`,
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

                  reset({
                    ...getValues(),
                    street: parsedStreet || displayName,
                    city: city,
                  });
                  showToast("Đã định vị địa chỉ thành công!", "success");
                } else {
                  showToast("Không thể giải mã tọa độ GPS!", "warning");
                }
              } catch (err) {
                console.error(err);
                showToast("Lỗi phân tích địa chỉ GPS!", "warning");
              }
            }
          },
          fail: (err: any) => {
            console.error(err);
            showToast(
              "Không lấy được vị trí GPS. Hãy bật GPS trên máy!",
              "warning",
            );
          },
        });
      } else {
        showToast("Zalo SDK không hỗ trợ định vị ở môi trường này!", "info");
      }
    } catch (e) {
      console.error(e);
    } finally {
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
        street: "",
        city: "",
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
                      reset({
                        label: addr.label || "",
                        phone: addr.phone || "",
                        street: addr.street || "",
                        city: addr.city || "",
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
              onClick={() => setShowAddForm(true)}
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
                Tên nhãn
              </label>
              <input
                type="text"
                {...register("label")}
                placeholder="Nhà riêng"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-textColor"
              />
              {errors.label && (
                <p className="mt-1 text-[10px] text-red-500">
                  {errors.label.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                Số điện thoại
              </label>
              <input
                type="text"
                {...register("phone")}
                placeholder="0987654321"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-textColor"
              />
              {errors.phone && (
                <p className="mt-1 text-[10px] text-red-500">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                Địa chỉ chi tiết
              </label>
              <input
                type="text"
                {...register("street")}
                placeholder="123 Nguyễn Du"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-textColor"
              />
              {errors.street && (
                <p className="mt-1 text-[10px] text-red-500">
                  {errors.street.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-[9px] font-bold text-textColor-variant uppercase tracking-wider block mb-1">
                Tỉnh / Thành phố
              </label>
              <input
                type="text"
                {...register("city")}
                placeholder="Hồ Chí Minh"
                className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary text-textColor"
              />
              {errors.city && (
                <p className="mt-1 text-[10px] text-red-500">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSubmit(async (values) => {
                  try {
                    if (editingAddressId) {
                      await apiRequest(
                        `/addresses/${editingAddressId}`,
                        "PUT",
                        {
                          label: values.label,
                          phone: values.phone,
                          street: values.street,
                          city: values.city,
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
                          street: values.street,
                          city: values.city,
                          isDefault: addresses.length === 0,
                        },
                      );
                      if (saved) {
                        await fetchAddresses();
                        setShowAddForm(false);
                        reset({ label: "", phone: "", street: "", city: "" });
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
