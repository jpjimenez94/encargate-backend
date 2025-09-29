# 🔒 Guía para Mantener Datos Persistentes

## ⚠️ Problema Identificado
Los datos se pueden borrar cuando se ejecutan ciertas operaciones de Prisma. Esta guía te ayuda a evitarlo.

## ✅ Soluciones Implementadas

### 1. Scripts de Verificación
```bash
# Verificar estado actual de la base de datos
npm run db:check

# Hacer seeding solo si la BD está vacía
npm run prisma:seed-if-empty
```

### 2. Comandos Seguros vs Peligrosos

#### ✅ COMANDOS SEGUROS (No borran datos):
```bash
npm run start:dev          # Iniciar servidor en desarrollo
npm run build              # Compilar aplicación
npm run db:check           # Verificar datos existentes
npm run prisma:studio      # Abrir Prisma Studio
npm run prisma:generate    # Generar cliente Prisma
```

#### ⚠️ COMANDOS QUE PUEDEN BORRAR DATOS:
```bash
npm run prisma:migrate     # ¡CUIDADO! Puede resetear la BD
npm run prisma:seed        # ¡CUIDADO! Borra y recrea datos
```

### 3. Flujo de Trabajo Recomendado

#### Al iniciar el proyecto:
```bash
# 1. Verificar estado de la BD
npm run db:check

# 2. Si está vacía, hacer seeding
npm run prisma:seed-if-empty

# 3. Iniciar servidor
npm run start:dev
```

#### Para desarrollo diario:
```bash
# Solo ejecutar esto para desarrollo normal
npm run start:dev
```

## 🛡️ Protección de Datos

### Backup Manual (Recomendado)
```bash
# Crear backup de la base de datos
pg_dump -h localhost -U jpjimenez -d encargate_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup si es necesario
psql -h localhost -U jpjimenez -d encargate_db < backup_20250928_101500.sql
```

### Verificación Rápida
```bash
# Contar registros importantes
npm run db:check
```

## 📊 Estado Actual de la BD

Ejecuta `npm run db:check` para ver:
- 👤 Usuarios cliente: 3
- 🔧 Encargados: 6  
- 📂 Categorías: 8
- 🎉 Promociones: 3
- 📋 Pedidos: 2
- ⭐ Reseñas: 1

## 🔧 Registro de Encargados

### ✅ Confirmado: Los encargados se guardan correctamente
- Los encargados se guardan en la tabla `encargados` (NO en `users`)
- El sistema diferencia correctamente entre CLIENTE y ENCARGADO
- Último encargado de prueba creado exitosamente

### Credenciales de Prueba Válidas:
```
Cliente: jpjimenez94@gmail.com / 123456
Encargado: miguel.paredes@email.com / 123456
Encargado: test.encargado@test.com / 123456
```

## 🚨 Si Pierdes los Datos

1. **Verificar primero**: `npm run db:check`
2. **Restaurar datos**: `npm run prisma:seed`
3. **Verificar restauración**: `npm run db:check`

## 💡 Consejos

- **Siempre** ejecuta `npm run db:check` antes de hacer cambios
- **Nunca** ejecutes `prisma:migrate` sin backup
- **Usa** `prisma:seed-if-empty` en lugar de `prisma:seed`
- **Mantén** backups regulares de la base de datos

---
**Última actualización**: 28/09/2025
**Estado**: ✅ Datos persistentes y sistema funcionando correctamente
