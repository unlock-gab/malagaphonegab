import { useQuery } from "@tanstack/react-query";

export interface StoreSettings {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  storeDescription?: string;
  storeLogo?: string;
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  orderPrefix?: string;
  invoicePrefix?: string;
  defaultOrderNote?: string;
  defaultDeliveryFee?: string;
  defaultShippingCompany?: string;
  invoiceStoreName?: string;
  invoicePhone?: string;
  invoiceAddress?: string;
  invoiceFooterNote?: string;
  invoiceShowLogo?: string;
  posDefaultPayment?: string;
  posAutoPrint?: string;
  facebookPixelId?: string;
  tiktokPixelId?: string;
}

export function useStoreSettings() {
  const { data = {} } = useQuery<StoreSettings>({ queryKey: ["/api/settings"] });
  return data;
}

export function buildWhatsAppUrl(phone: string, message?: string) {
  const num = phone.replace(/^0/, "213").replace(/\D/g, "");
  return `https://wa.me/${num}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
