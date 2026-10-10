import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
try {
  const roles = [
    {
      name: 'Administrador',
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      role: 'ADMIN' as const,
    },
    {
      name: 'Player One',
      email: process.env.SEED_CUSTOMER_EMAIL,
      password: process.env.SEED_CUSTOMER_PASSWORD,
      role: 'CUSTOMER' as const,
    },
  ];
  for (const user of roles) {
    if (!user.email || !user.password || user.password.length < 8)
      throw new Error(
        'Configura SEED_ADMIN_EMAIL/PASSWORD y SEED_CUSTOMER_EMAIL/PASSWORD en .env (o ejecuta npm run setup).',
      );
    await db.user.upsert({
      where: { email: user.email.toLowerCase() },
      update: {},
      create: {
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash: await bcrypt.hash(user.password, 12),
        role: user.role,
      },
    });
  }
  const categories = new Map<string, string>();
  for (const name of ['Acción', 'RPG', 'Carreras', 'Aventura', 'Estrategia'])
    categories.set(
      name,
      (await db.category.upsert({ where: { name }, update: {}, create: { name } })).id,
    );
  const platforms = new Map<string, string>();
  for (const name of ['PC', 'PlayStation 5', 'Xbox Series', 'Nintendo Switch'])
    platforms.set(
      name,
      (await db.platform.upsert({ where: { name }, update: {}, create: { name } })).id,
    );
  const games = [
    {
      name: 'Nexus: Beyond the Void',
      slug: 'nexus-beyond-the-void',
      description:
        'Cruza la última frontera de la humanidad. Explora una metrópolis alienígena, domina tecnología olvidada y descubre los secretos del Vacío en una aventura de acción de mundo abierto. Tu destino está más allá de las estrellas.',
      price: 39.99,
      originalPrice: 59.99,
      image: '/assets/nexus.png',
      stock: 30,
      featured: true,
      rating: 4.9,
      category: 'Acción',
      platforms: ['PC', 'PlayStation 5', 'Xbox Series'],
      date: '2026-09-20',
    },
    {
      name: 'Emberfall',
      slug: 'emberfall',
      description:
        'Un reino en cenizas. Una última promesa. Recorre catedrales olvidadas y bosques ancestrales, forja tu propia leyenda y enfrenta criaturas colosales en este RPG de fantasía oscura. Cada decisión deja una marca en el mundo.',
      price: 49.99,
      originalPrice: 69.99,
      image: '/assets/emberfall.png',
      stock: 18,
      featured: true,
      rating: 4.8,
      category: 'RPG',
      platforms: ['PC', 'PlayStation 5', 'Xbox Series'],
      date: '2026-08-12',
    },
    {
      name: 'Velocity 2099',
      slug: 'velocity-2099',
      description:
        'La ciudad nunca duerme. Tú tampoco. Domina circuitos urbanos de alta velocidad, personaliza tu vehículo y conquista el asfalto entre luces de neón. Una experiencia de carreras donde cada milisegundo cuenta.',
      price: 29.99,
      originalPrice: 49.99,
      image: '/assets/velocity.png',
      stock: 22,
      featured: true,
      rating: 4.7,
      category: 'Carreras',
      platforms: ['PC', 'Xbox Series'],
      date: '2026-10-01',
    },
    {
      name: 'Titan Protocol',
      slug: 'titan-protocol',
      description:
        'Conviértete en piloto de un titán de acero. Combina combate táctico y acción intensa mientras proteges la última ciudad de la Tierra. Mejora tu mecha, elige tu equipamiento y cambia el curso de la batalla.',
      price: 44.99,
      originalPrice: null,
      image: '/assets/titan.png',
      stock: 15,
      featured: true,
      rating: 4.6,
      category: 'Acción',
      platforms: ['PC', 'PlayStation 5'],
      date: '2026-09-05',
    },
    {
      name: 'Astral Odyssey',
      slug: 'astral-odyssey',
      description:
        'Un universo de posibilidades te espera. Descubre planetas imposibles, construye tu nave y conoce civilizaciones perdidas en una aventura de exploración espacial. El próximo horizonte siempre guarda una nueva historia.',
      price: 34.99,
      originalPrice: 44.99,
      image: '/assets/odyssey.png',
      stock: 26,
      featured: false,
      rating: 4.8,
      category: 'Aventura',
      platforms: ['PC', 'PlayStation 5', 'Nintendo Switch'],
      date: '2026-09-28',
    },
    {
      name: 'Echoes of Aether',
      slug: 'echoes-of-aether',
      description:
        'Escucha el eco de un mundo antiguo. Resuelve misterios, domina la magia elemental y reúne a un grupo de héroes únicos en una historia sobre amistad, memoria y un reino que se niega a desaparecer.',
      price: 24.99,
      originalPrice: 39.99,
      image: '/assets/emberfall.png',
      stock: 12,
      featured: false,
      rating: 4.5,
      category: 'RPG',
      platforms: ['PC', 'Nintendo Switch'],
      date: '2026-07-15',
    },
    {
      name: 'Neon Drift',
      slug: 'neon-drift',
      description:
        'Encuentra tu ritmo en las calles del futuro. Perfecciona cada derrape, descubre rutas secretas y escala una liga de pilotos callejeros. Carreras rápidas y una atmósfera inolvidable para jugar una vez más.',
      price: 19.99,
      originalPrice: 29.99,
      image: '/assets/velocity.png',
      stock: 4,
      featured: false,
      rating: 4.4,
      category: 'Carreras',
      platforms: ['PC', 'Nintendo Switch'],
      date: '2026-06-01',
    },
    {
      name: 'Void Command',
      slug: 'void-command',
      description:
        'La galaxia necesita una estrategia. Dirige una flota, desarrolla nuevas tecnologías y negocia con facciones rivales en un universo dinámico. Planifica tu expansión y convierte una pequeña colonia en una civilización.',
      price: 29.99,
      originalPrice: null,
      image: '/assets/odyssey.png',
      stock: 3,
      featured: false,
      rating: 4.6,
      category: 'Estrategia',
      platforms: ['PC'],
      date: '2026-10-05',
    },
  ];
  for (const game of games) {
    const { category, platforms: names, date, ...data } = game;
    await db.game.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        releaseDate: new Date(date),
        categoryId: categories.get(category)!,
        platforms: { create: names.map((name) => ({ platformId: platforms.get(name)! })) },
      },
    });
  }
  console.log(
    'Datos de demostración listos: 8 juegos, 5 categorías, 4 plataformas y 2 cuentas. El seed conserva los registros existentes.',
  );
} finally {
  await db.$disconnect();
}
