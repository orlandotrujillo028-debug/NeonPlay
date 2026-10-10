export type Named = { id: string; name: string };
export type User = Named & {
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  active?: boolean;
  createdAt?: string;
};
export type Game = Named & {
  slug: string;
  description: string;
  price: string;
  originalPrice: string | null;
  image: string;
  stock: number;
  featured: boolean;
  rating: string;
  releaseDate: string;
  archived: boolean;
  categoryId: string;
  category: Named;
  platforms: { platformId: string; platform: Named }[];
};
export type CartItem = {
  gameId: string;
  platformId: string;
  platformName: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  stock: number;
  quantity: number;
};
export type Order = {
  id: string;
  total: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  user?: { name: string; email: string };
  items: {
    id: string;
    gameId: string;
    gameName: string;
    platformName: string;
    image: string;
    price: string;
    quantity: number;
  }[];
};
export type Catalog = { games: Game[]; total: number; page: number; pages: number };
export type Meta = { categories: Named[]; platforms: Named[] };
export type Dashboard = {
  games: number;
  users: number;
  orders: number;
  revenue: string;
  lowStock: Game[];
  recentOrders: Order[];
};
