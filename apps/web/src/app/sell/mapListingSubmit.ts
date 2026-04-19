import type { CreateListingInput } from '@/lib/types/firestore';

export type SellFormAiEvidence = {
  brand?: string;
  model?: string;
  model_exact?: string;
  model_range?: string;
  gtin?: string;
} | null;

export type SellFormStateForSubmit = {
  title: string;
  description: string;
  price: string;
  category: string;
  condition?: string;
  shipping?: {
    weight?: string;
    length?: string;
    width?: string;
    height?: string;
    labelScanUrl?: string;
  };
};

/**
 * Maps the sell wizard state to the POST /api/listings body (CreateListingInput).
 */
export function buildSellListingPayload(params: {
  formData: SellFormStateForSubmit;
  photoUrls: string[];
  sellerId: string;
  aiAnalysis: { brand?: string; model?: string } | null;
  initialEvidence: SellFormAiEvidence;
}): CreateListingInput {
  const { formData, photoUrls, sellerId, aiAnalysis, initialEvidence } = params;

  const listingData: CreateListingInput = {
    title: formData.title,
    description: formData.description,
    price: parseFloat(formData.price),
    category: formData.category,
    images: photoUrls,
    condition: (formData.condition || 'good') as CreateListingInput['condition'],
    inventory: 1,
    isActive: true,
    sellerId,
  };

  const brand = initialEvidence?.brand ?? aiAnalysis?.brand;
  const model =
    initialEvidence?.model_exact ?? initialEvidence?.model_range ?? aiAnalysis?.model;
  if (brand) listingData.brand = brand;
  if (model) listingData.model = model;
  if (initialEvidence?.gtin) listingData.gtin = initialEvidence.gtin;

  const s = formData.shipping;
  if (
    s &&
    (s.weight || s.length || s.width || s.height || s.labelScanUrl)
  ) {
    listingData.shipping = {
      weight: s.weight ? parseFloat(s.weight) : undefined,
      length: s.length ? parseFloat(s.length) : undefined,
      width: s.width ? parseFloat(s.width) : undefined,
      height: s.height ? parseFloat(s.height) : undefined,
      labelScanUrl: s.labelScanUrl || undefined,
    };
  }

  return listingData;
}
