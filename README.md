# 🏠 Encárgate Backend API

Backend completo desarrollado con **NestJS**, **Prisma** y **PostgreSQL** para la aplicación Encárgate - Plataforma de servicios domésticos y profesionales.

## 🚀 Características

- **Framework**: NestJS con TypeScript
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: JWT con Passport
- **Documentación**: Swagger/OpenAPI
- **Validación**: class-validator y class-transformer
- **Seguridad**: Guards, roles y middleware de seguridad

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL (v12 o superior)
- npm o yarn

## 🛠️ Instalación

### 1. Clonar o ubicar el proyecto

```bash
cd encargate-nestjs-backend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura tus variables:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# Database
DATABASE_URL="postgresql://usuario:password@localhost:5432/encargate_db?schema=public"

# JWT
JWT_SECRET="tu_jwt_secret_super_seguro_aqui"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL="http://localhost:3000"
```

### 4. Configurar la base de datos

#### Crear la base de datos PostgreSQL:

```sql
CREATE DATABASE encargate_db;
```

#### Generar el cliente Prisma:

```bash
npx prisma generate
```

#### Ejecutar migraciones:

```bash
npx prisma migrate dev --name init
```

#### Poblar la base de datos con datos de prueba:

```bash
npm run prisma:seed
```

### 5. Iniciar el servidor

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

El servidor estará disponible en: `http://localhost:3001`

## 📚 Documentación API

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva de Swagger en:

**http://localhost:3001/api/docs**

## 🔐 Autenticación

### Credenciales de Prueba

**Cliente:**
- Email: `jpjimenez94@gmail.com`
- Password: `123456`

**Encargados:**
- Email: `miguel.paredes@email.com` / Password: `123456`
- Email: `julian.herrera@email.com` / Password: `123456`
- Email: `carolina.lopez@email.com` / Password: `123456`

### Uso de JWT

1. **Login**: `POST /api/auth/login`
2. **Incluir token**: Agregar header `Authorization: Bearer <token>`

## 🛣️ Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario autenticado

### Usuarios
- `GET /api/users` - Listar usuarios
- `GET /api/users/profile` - Perfil del usuario
- `PATCH /api/users/:id` - Actualizar usuario

### Encargados
- `GET /api/encargados` - Listar encargados (con filtros)
- `GET /api/encargados/:id` - Obtener encargado por ID
- `PATCH /api/encargados/:id` - Actualizar encargado
- `PATCH /api/encargados/:id/toggle-availability` - Cambiar disponibilidad

### Categorías
- `GET /api/categories` - Listar categorías
- `GET /api/categories/:id` - Obtener categoría con encargados

### Pedidos
- `POST /api/orders` - Crear pedido (solo clientes)
- `GET /api/orders` - Listar pedidos (filtrados por usuario)
- `GET /api/orders/stats` - Estadísticas de pedidos
- `PATCH /api/orders/:id` - Actualizar estado del pedido

### Reseñas
- `POST /api/reviews` - Crear reseña (solo clientes)
- `GET /api/reviews` - Listar reseñas
- `GET /api/reviews/stats/:encargadoId` - Estadísticas de reseñas

### Promociones
- `GET /api/promotions` - Listar promociones
- `GET /api/promotions/active` - Promociones activas
- `POST /api/promotions` - Crear promoción (solo encargados)

### Favoritos
- `GET /api/favorites` - Mis favoritos (solo clientes)
- `POST /api/favorites` - Agregar a favoritos
- `POST /api/favorites/toggle/:encargadoId` - Alternar favorito
- `DELETE /api/favorites/:encargadoId` - Quitar de favoritos

## 🗄️ Estructura de la Base de Datos

### Entidades Principales

- **User**: Usuarios cliente
- **Encargado**: Proveedores de servicios
- **Category**: Categorías de servicios
- **Order**: Pedidos/reservas
- **Review**: Reseñas y calificaciones
- **Promotion**: Promociones y descuentos
- **Favorite**: Favoritos de usuarios

### Relaciones

- Usuario → Pedidos (1:N)
- Usuario → Reseñas (1:N)
- Usuario → Favoritos (1:N)
- Encargado → Pedidos (1:N)
- Encargado → Reseñas (1:N)
- Categoría → Encargados (1:N)
- Pedido → Reseña (1:1)

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Iniciar en modo desarrollo
npm run start:debug        # Iniciar con debug

# Producción
npm run build              # Compilar proyecto
npm run start:prod         # Iniciar en producción

# Base de datos
npm run prisma:generate    # Generar cliente Prisma
npm run prisma:migrate     # Ejecutar migraciones
npm run prisma:studio      # Abrir Prisma Studio
npm run prisma:seed        # Poblar base de datos

# Testing
npm run test               # Ejecutar tests
npm run test:watch         # Tests en modo watch
npm run test:cov           # Tests con coverage

# Linting
npm run lint               # Ejecutar ESLint
npm run format             # Formatear código
```

## 🏗️ Arquitectura del Proyecto

```
src/
├── auth/                  # Autenticación y autorización
│   ├── decorators/        # Decoradores personalizados
│   ├── dto/              # DTOs de autenticación
│   ├── guards/           # Guards de seguridad
│   └── strategies/       # Estrategias de Passport
├── users/                # Módulo de usuarios
├── encargados/           # Módulo de encargados
├── categories/           # Módulo de categorías
├── orders/               # Módulo de pedidos
├── reviews/              # Módulo de reseñas
├── promotions/           # Módulo de promociones
├── favorites/            # Módulo de favoritos
├── prisma/               # Configuración de Prisma
├── app.module.ts         # Módulo principal
└── main.ts               # Punto de entrada
```

## 🔒 Seguridad

- **JWT**: Tokens seguros con expiración
- **Bcrypt**: Encriptación de contraseñas
- **Guards**: Protección de rutas
- **Roles**: Control de acceso por tipo de usuario
- **Validación**: Validación estricta de datos de entrada
- **CORS**: Configurado para el frontend

## 🚀 Despliegue

### Variables de Entorno para Producción

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="super_secret_jwt_key_for_production"
PORT=3001
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

## 🤝 Integración con Frontend

Este backend está diseñado para ser **100% compatible** con el frontend de Encárgate desarrollado en Next.js. 

### Configuración del Frontend

En tu frontend, configura la URL del API:

```typescript
// services/api.ts
const API_BASE_URL = 'http://localhost:3001/api';
```

### Tipos TypeScript

Los tipos están alineados con el frontend existente:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'CLIENTE' | 'ENCARGADO';
  // ... otros campos
}
```

## 📞 Soporte

Para soporte o preguntas sobre la implementación:

1. Revisa la documentación de Swagger
2. Verifica los logs del servidor
3. Consulta los ejemplos en el seeder

## 🎯 Próximas Características

- [ ] Notificaciones en tiempo real
- [ ] Sistema de pagos integrado
- [ ] Chat entre usuarios
- [ ] Geolocalización avanzada
- [ ] Sistema de reportes
- [ ] API de métricas y analytics

---

**¡El backend está listo para conectar con tu frontend de Encárgate! 🚀**
