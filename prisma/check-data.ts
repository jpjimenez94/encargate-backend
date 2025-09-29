import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Verificando datos en la base de datos...\n');

    // Verificar usuarios
    const users = await prisma.user.count();
    console.log(`👤 Usuarios cliente: ${users}`);

    // Verificar encargados
    const encargados = await prisma.encargado.count();
    console.log(`🔧 Encargados: ${encargados}`);

    // Verificar categorías
    const categories = await prisma.category.count();
    console.log(`📂 Categorías: ${categories}`);

    // Verificar promociones
    const promotions = await prisma.promotion.count();
    console.log(`🎉 Promociones: ${promotions}`);

    // Verificar pedidos
    const orders = await prisma.order.count();
    console.log(`📋 Pedidos: ${orders}`);

    // Verificar reseñas
    const reviews = await prisma.review.count();
    console.log(`⭐ Reseñas: ${reviews}`);

    console.log('\n✅ Verificación completada');

    if (users === 0 && encargados === 0 && categories === 0) {
      console.log('⚠️  La base de datos está vacía. Ejecuta: npm run prisma:seed');
    }

  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
