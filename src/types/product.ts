export interface Product {
  id?: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;

  type:
    | "surprise"
    | "flower"
    | "decoration";

  category: string;

  occasion?: string;

  items: string[];

  isActive: boolean;

  createdAt?: any;
}