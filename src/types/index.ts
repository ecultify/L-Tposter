export interface Company {
  id?: number;
  name: string;
  tagline: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string | null;
}

export interface User {
  name?: string;
  phone: string;
  email?: string;
  verified?: boolean;
  company_id?: number;
}

export interface PosterTemplate {
  id: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ProcessedImage {
  original: string;
  processed: string;
}