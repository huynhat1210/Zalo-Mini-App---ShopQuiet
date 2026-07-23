export interface IBanner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  position?: number;
}

export interface IBannersProps {}
