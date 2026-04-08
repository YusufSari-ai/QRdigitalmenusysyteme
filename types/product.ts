export interface Product {
  id: string;
  name: string;
  description: string;
  tags: string[];
  image_url: string;
  price: number;
  categoryId: string;
  orderIndex: number;
  createdAt: string;
}
