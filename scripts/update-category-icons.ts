import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCategoryIcons() {
  console.log('🎨 Actualizando iconos de categorías...');

  try {
    const iconUpdates = [
      { id: 'hogar', icon: '🏡' },
      { id: 'belleza', icon: '✨' },
      { id: 'educacion', icon: '🎓' },
      { id: 'cuidado', icon: '👶' },
      { id: 'tecnologia', icon: '⚡' },
      { id: 'profesionales', icon: '🎯' },
      { id: 'mascotas', icon: '🐕' },
      { id: 'mas', icon: '⚙️' },
    ];

    let updated = 0;
    let notFound = 0;

    for (const update of iconUpdates) {
      try {
        await prisma.category.update({
          where: { id: update.id },
          data: { icon: update.icon },
        });
        console.log(`✅ Actualizado: ${update.id} → ${update.icon}`);
        updated++;
      } catch (error) {
        console.log(`⚠️ Categoría no encontrada: ${update.id}`);
        notFound++;
      }
    }

    console.log(`\n✅ Actualización completada:`);
    console.log(`   - ${updated} categorías actualizadas`);
    if (notFound > 0) {
      console.log(`   - ${notFound} categorías no encontradas`);
    }
  } catch (error) {
    console.error('❌ Error actualizando iconos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateCategoryIcons()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
