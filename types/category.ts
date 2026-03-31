export interface Category {
  id: string;
  name: string;
  image_url: string;
  orderIndex: number;
  createdAt: string;
}

export interface CategoryWithProducts extends Category {
  products: import("./product").Product[];
}
