import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎨 Seeding banners...');

  const banners = [
    {
      icon: '🏠',
      title: 'Encárgate App',
      headline: '¡Encuentra tu servicio ideal!',
      subtitle: 'Miles de profesionales verificados',
      gradient: 'from-orange-400 to-orange-500',
      image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&h=200&fit=crop&auto=format',
      active: true,
      order: 1,
    },
    {
      icon: '⚡',
      title: 'Servicio Express',
      headline: '¡Atención inmediata!',
      subtitle: 'Respuesta en menos de 1 hora',
      gradient: 'from-blue-400 to-blue-500',
      image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=200&h=200&fit=crop&auto=format',
      active: true,
      order: 2,
    },
    {
      icon: '⭐',
      title: 'Calidad Garantizada',
      headline: '¡Profesionales certificados!',
      subtitle: 'Todos nuestros encargados están verificados',
      gradient: 'from-purple-400 to-purple-500',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&auto=format',
      active: true,
      order: 3,
    },
    {
      icon: '💰',
      title: 'Mejores Precios',
      headline: '¡Ahorra hasta 40%!',
      subtitle: 'Compara y elige la mejor opción',
      gradient: 'from-green-400 to-green-500',
      image: 'https://images.unsplash.com/photo-1554224311-beee415c201f?w=200&h=200&fit=crop&auto=format',
      active: true,
      order: 4,
    },
  ];

  for (const banner of banners) {
    await prisma.banner.upsert({
      where: { id: `banner-${banner.order}` },
      update: banner,
      create: {
        id: `banner-${banner.order}`,
        ...banner,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Banner creado: ${banner.title}`);
  }

  console.log('🎉 Banners seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
