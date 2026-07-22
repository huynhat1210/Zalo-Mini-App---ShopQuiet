import { DeliveryDateRange } from "./delivery-date.type";

/**
 * Calculate estimated delivery date range
 * @param createdAt - Order creation date
 * @param shippingMethodCode - Shipping method code (standard, express, etc.)
 * @param minDays - Minimum business days (default based on method)
 * @param maxDays - Maximum business days (default based on method)
 * @returns Delivery date range with formatted strings
 */
export function calculateEstimatedDeliveryDate(
  createdAt: Date | string,
  shippingMethodCode: string = "standard",
  minDays?: number,
  maxDays?: number,
): DeliveryDateRange {
  const baseDate = new Date(createdAt);

  // Default business days based on shipping method
  const defaultDays: Record<string, { min: number; max: number }> = {
    standard: { min: 3, max: 5 },
    express: { min: 1, max: 2 },
  };

  const days = defaultDays[shippingMethodCode] || { min: 3, max: 5 };
  const minBusinessDays = minDays ?? days.min;
  const maxBusinessDays = maxDays ?? days.max;

  const minDate = addBusinessDays(baseDate, minBusinessDays);
  const maxDate = addBusinessDays(baseDate, maxBusinessDays);

  return {
    minDate,
    maxDate,
    minDateString: formatDate(minDate),
    maxDateString: formatDate(maxDate),
    displayText: `${formatDate(minDate)} - ${formatDate(maxDate)}`,
  };
}

/**
 * Add business days to a date (skipping weekends)
 * @param date - Starting date
 * @param businessDays - Number of business days to add
 * @returns Date after adding business days
 */
function addBusinessDays(date: Date, businessDays: number): Date {
  const result = new Date(date);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();

    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * Format date to Vietnamese format (dd/mm/yyyy)
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Calculate remaining days until delivery
 * @param estimatedDate - Estimated delivery date
 * @returns Number of remaining days (0 if today or past)
 */
export function getRemainingDays(estimatedDate: Date | string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delivery = new Date(estimatedDate);
  delivery.setHours(0, 0, 0, 0);

  const diffTime = delivery.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Get delivery status text based on remaining days
 * @param remainingDays - Number of remaining days
 * @returns Status text
 */
export function getDeliveryStatusText(remainingDays: number): string {
  if (remainingDays === 0) return "Hôm nay";
  if (remainingDays === 1) return "Ngày mai";
  if (remainingDays <= 3) return `Còn ${remainingDays} ngày`;
  return `${remainingDays} ngày nữa`;
}
