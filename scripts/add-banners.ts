import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addBanners() {
  console.log('🎨 Agregando banners...');

  try {
    // Crear banners solo si no existen
    const existingBanners = await prisma.banner.count();
    
    if (existingBanners > 0) {
      console.log(`✅ Ya existen ${existingBanners} banners, no es necesario agregarlos`);
      return;
    }

    const banners = [
      {
        id: '1',
        icon: '🏡',
        title: 'Servicios de Hogar',
        headline: '40% OFF',
        subtitle: '¡Descuentos especiales en servicios del hogar!',
        gradient: 'bg-gradient-to-r from-orange-400 to-pink-500',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop&auto=format',
        active: true,
        order: 1,
      },
      {
        id: '2',
        icon: '✨',
        title: 'Belleza y Cuidado',
        headline: '25% OFF',
        subtitle: 'Profesionales certificados para tu bienestar',
        gradient: 'bg-gradient-to-r from-purple-400 to-pink-500',
        image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=200&fit=crop&auto=format',
        active: true,
        order: 2,
      },
      {
        id: '3',
        icon: '🎯',
        title: 'Profesionales',
        headline: '15% OFF',
        subtitle: 'Expertos a tu servicio cuando los necesites',
        gradient: 'bg-gradient-to-r from-blue-400 to-cyan-500',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=200&fit=crop&auto=format',
        active: true,
        order: 3,
      },
    ];

    for (const banner of banners) {
      await prisma.banner.create({
        data: banner,
      });
    }

    console.log(`✅ ${banners.length} banners creados exitosamente`);
  } catch (error) {
    console.error('❌ Error agregando banners:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addBanners()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
