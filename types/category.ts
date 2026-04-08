export type CardType = "vertical" | "horizontal";

export interface Category {
  id: string;
  name: string;
  image_url: string;
  orderIndex: number;
  createdAt: string;
  card_type: CardType;
}

export interface CategoryWithProducts extends Category {
  products: import("./product").Product[];
}
