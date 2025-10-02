const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración de Wompi...\n');

// Verificar archivo .env
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ Archivo .env NO encontrado');
  console.log('📝 Copia .env.example a .env y configura tus credenciales\n');
  console.log('Comando: copy .env.example .env\n');
  process.exit(1);
}

console.log('✅ Archivo .env encontrado\n');

// Leer variables de entorno
require('dotenv').config();

const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'FRONTEND_URL',
  'WOMPI_PUBLIC_KEY',
  'WOMPI_INTEGRITY_SECRET',
  'WOMPI_API_URL',
];

let allConfigured = true;

console.log('📋 Variables de entorno:\n');

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === '' || value.includes('xxxxx') || value.includes('password@host')) {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
    allConfigured = false;
  } else {
    // Mostrar solo los primeros caracteres por seguridad
    const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`✅ ${varName}: ${preview}`);
  }
});

console.log('\n');

if (!allConfigured) {
  console.log('⚠️  Algunas variables no están configuradas correctamente');
  console.log('📝 Edita el archivo .env con tus credenciales reales\n');
  console.log('Para Wompi sandbox, usa:');
  console.log('  WOMPI_PUBLIC_KEY="pub_test_Yr6nKO4cM4Y1mcvq3dKwfvLMOZcbjYX4"');
  console.log('  WOMPI_INTEGRITY_SECRET="test_integrity_xxxxx"');
  console.log('  WOMPI_API_URL="https://sandbox.wompi.co/v1"\n');
  process.exit(1);
}

console.log('✅ Todas las variables están configuradas\n');

// Verificar módulos de Wompi
console.log('📦 Verificando módulos de Wompi...\n');

const wompiServicePath = path.join(__dirname, 'src', 'wompi', 'wompi.service.ts');
const wompiControllerPath = path.join(__dirname, 'src', 'wompi', 'wompi.controller.ts');
const wompiModulePath = path.join(__dirname, 'src', 'wompi', 'wompi.module.ts');

const files = [
  { path: wompiServicePath, name: 'wompi.service.ts' },
  { path: wompiControllerPath, name: 'wompi.controller.ts' },
  { path: wompiModulePath, name: 'wompi.module.ts' },
];

files.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✅ ${file.name} encontrado`);
  } else {
    console.log(`❌ ${file.name} NO encontrado`);
    allConfigured = false;
  }
});

console.log('\n');

if (allConfigured) {
  console.log('🎉 ¡Configuración de Wompi completa!\n');
  console.log('📝 Próximos pasos:');
  console.log('  1. npm install');
  console.log('  2. npm run prisma:generate');
  console.log('  3. npm run start:dev\n');
  console.log('📚 Documentación: Ver WOMPI_SETUP.md\n');
} else {
  console.log('⚠️  Configuración incompleta. Revisa los errores arriba.\n');
  process.exit(1);
}
