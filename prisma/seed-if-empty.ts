import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function seedIfEmpty() {
  try {
    console.log('🔍 Verificando si la base de datos necesita datos...');

    // Verificar si hay datos existentes
    const [users, encargados, categories] = await Promise.all([
      prisma.user.count(),
      prisma.encargado.count(),
      prisma.category.count()
    ]);

    const totalRecords = users + encargados + categories;

    if (totalRecords === 0) {
      console.log('📊 Base de datos vacía. Ejecutando seeding...');
      execSync('npm run prisma:seed', { stdio: 'inherit' });
    } else {
      console.log(`📊 Base de datos ya tiene datos: ${users} usuarios, ${encargados} encargados, ${categories} categorías`);
      console.log('✅ No es necesario ejecutar seeding');
    }

  } catch (error) {
    console.error('❌ Error verificando/seeding datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedIfEmpty();
