import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  // Limpiar datos existentes
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.encargado.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Crear categorías
  console.log('📂 Creando categorías...');
  const categories = [
    {
      id: 'hogar',
      name: 'Hogar',
      icon: '🏡',
      color: '#8B5CF6',
      description: 'Servicios para el hogar',
      services: ['Limpieza', 'Plomería', 'Electricidad', 'Carpintería'],
    },
    {
      id: 'belleza',
      name: 'Belleza',
      icon: '✨',
      color: '#F97316',
      description: 'Servicios de belleza y cuidado personal',
      services: ['Peluquería', 'Manicure', 'Masajes', 'Estética'],
    },
    {
      id: 'educacion',
      name: 'Educación',
      icon: '🎓',
      color: '#3B82F6',
      description: 'Servicios educativos y tutorías',
      services: ['Tutorías', 'Clases particulares', 'Idiomas'],
    },
    {
      id: 'cuidado',
      name: 'Cuidado Infantil',
      icon: '👶',
      color: '#EAB308',
      description: 'Cuidado de niños y bebés',
      services: ['Niñera', 'Cuidado de bebés', 'Actividades infantiles'],
    },
    {
      id: 'tecnologia',
      name: 'Tecnología',
      icon: '⚡',
      color: '#EF4444',
      description: 'Servicios tecnológicos',
      services: ['Reparación PC', 'Instalación software', 'Soporte técnico'],
    },
    {
      id: 'profesionales',
      name: 'Profesionales',
      icon: '🎯',
      color: '#22C55E',
      description: 'Servicios profesionales',
      services: ['Contabilidad', 'Legal', 'Consultoría'],
    },
    {
      id: 'mascotas',
      name: 'Mascotas',
      icon: '🐕',
      color: '#14B8A6',
      description: 'Cuidado de mascotas',
      services: ['Veterinaria', 'Peluquería canina', 'Paseo de perros'],
    },
    {
      id: 'mas',
      name: 'Más',
      icon: '⚙️',
      color: '#6B7280',
      description: 'Otros servicios',
      services: ['Otros'],
    },
  ];

  for (const category of categories) {
    await prisma.category.create({ data: category });
  }

  // Crear usuario administrador
  console.log('👑 Creando usuario administrador...');
  const hashedPassword = await bcrypt.hash('123456', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@encargate.com',
      password: hashedPassword,
      role: Role.ADMIN,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
      phone: '+57 300 000 0000',
      location: 'Bogotá D.C.',
      verified: true,
    },
  });
  console.log(`✅ Admin creado: ${adminUser.email}`);

  // Crear usuarios cliente
  console.log('👤 Creando usuarios cliente...');
  
  const users = [
    {
      name: 'Juan Jiménez',
      email: 'jpjimenez94@gmail.com',
      password: hashedPassword,
      role: Role.CLIENTE,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format',
      phone: '+57 300 123 4567',
      location: 'Bogotá D.C.',
      verified: true,
    },
    {
      name: 'María García',
      email: 'maria.garcia@email.com',
      password: hashedPassword,
      role: Role.CLIENTE,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face&auto=format',
      phone: '+57 301 987 6543',
      location: 'Medellín',
      verified: true,
    },
  ];

  const createdUsers = [];
  for (const user of users) {
    const createdUser = await prisma.user.create({ data: user });
    createdUsers.push(createdUser);
  }

  // Crear encargados
  console.log('🔧 Creando encargados...');
  const encargados = [
    {
      name: 'Miguel Paredes',
      email: 'miguel.paredes@email.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face&auto=format',
      location: 'Bogotá D.C.',
      verified: true,
      service: 'Plomería',
      categoryId: 'hogar',
      price: 254.99,
      priceMin: 50,
      priceMax: 300,
      rating: 5.0,
      reviewsCount: 127,
      experience: '5 años',
      description: 'Plomero certificado con amplia experiencia en reparaciones residenciales y comerciales.',
      services: ['Reparación de tuberías', 'Instalación de grifos', 'Destapado de cañerías'],
      available: true,
    },
    {
      name: 'Julián Herrera',
      email: 'julian.herrera@email.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=150&h=150&fit=crop&crop=face&auto=format',
      location: 'Medellín',
      verified: true,
      service: 'Electricista',
      categoryId: 'hogar',
      price: 354.99,
      priceMin: 80,
      priceMax: 500,
      rating: 5.0,
      reviewsCount: 89,
      experience: '8 años',
      description: 'Electricista profesional especializado en instalaciones residenciales y comerciales.',
      services: ['Instalación eléctrica', 'Reparación de circuitos', 'Iluminación LED'],
      available: true,
    },
    {
      name: 'Andrés Salazar',
      email: 'andres.salazar@email.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=150&h=150&fit=crop&crop=face&auto=format',
      location: 'Cali',
      verified: true,
      service: 'Carpintería',
      categoryId: 'hogar',
      price: 264.99,
      priceMin: 100,
      priceMax: 400,
      rating: 5.0,
      reviewsCount: 156,
      experience: '10 años',
      description: 'Carpintero experto en muebles a medida y reparaciones de madera.',
      services: ['Muebles a medida', 'Reparación de puertas', 'Instalación de closets'],
      available: false,
    },
    {
      name: 'Carolina López',
      email: 'carolina.lopez@email.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1594824388853-e0c5c9e1e4c5?w=150&h=150&fit=crop&crop=face&auto=format',
      location: 'Bogotá D.C.',
      verified: true,
      service: 'Peluquería',
      categoryId: 'belleza',
      price: 180.00,
      priceMin: 50,
      priceMax: 250,
      rating: 4.8,
      reviewsCount: 203,
      experience: '6 años',
      description: 'Estilista profesional especializada en cortes modernos y coloración.',
      services: ['Corte de cabello', 'Coloración', 'Peinados para eventos'],
      available: true,
    },
    {
      name: 'Roberto Martínez',
      email: 'roberto.martinez@email.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format',
      location: 'Medellín',
      verified: true,
      service: 'Soporte Técnico',
      categoryId: 'tecnologia',
      price: 120.00,
      priceMin: 60,
      priceMax: 200,
      rating: 4.9,
      reviewsCount: 78,
      experience: '4 años',
      description: 'Técnico en sistemas especializado en reparación de computadores y redes.',
      services: ['Reparación PC', 'Instalación software', 'Configuración redes'],
      available: true,
    },
  ];

  const createdEncargados = [];
  for (const encargado of encargados) {
    const createdEncargado = await prisma.encargado.create({ data: encargado });
    createdEncargados.push(createdEncargado);
  }

  // Crear promociones
  console.log('🎉 Creando promociones...');
  const promotions = [
    {
      title: '40% OFF',
      subtitle: 'Limpieza Profunda',
      description: 'Descuento especial en servicios de limpieza para el hogar',
      discount: 40,
      category: 'hogar',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      active: true,
      validUntil: new Date('2024-12-31'),
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100&h=100&fit=crop&auto=format',
    },
    {
      title: '15% OFF',
      subtitle: 'Servicios',
      description: 'Descuento en todos los servicios profesionales',
      discount: 15,
      category: 'all',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      active: true,
      validUntil: new Date('2024-11-30'),
      image: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=100&h=100&fit=crop&auto=format',
    },
    {
      title: '25% OFF',
      subtitle: 'Primera Vez',
      description: 'Descuento especial para nuevos usuarios',
      discount: 25,
      category: 'all',
      color: 'green',
      gradient: 'from-green-500 to-green-600',
      active: true,
      validUntil: new Date('2024-12-15'),
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100&h=100&fit=crop&auto=format',
    },
  ];

  for (const promotion of promotions) {
    await prisma.promotion.create({ data: promotion });
  }

  // Crear pedidos de ejemplo
  console.log('📋 Creando pedidos de ejemplo...');
  const orders = [
    {
      userId: createdUsers[0].id,
      encargadoId: createdEncargados[0].id,
      categoryId: 'hogar',
      service: 'Reparación de tubería',
      description: 'Reparación urgente en la cocina',
      address: 'Calle 123 #45-67, Bogotá',
      date: new Date('2024-03-15'),
      time: '10:00 AM',
      status: OrderStatus.COMPLETED,
      price: 254.99,
      paymentMethod: 'tarjeta',
    },
    {
      userId: createdUsers[0].id,
      encargadoId: createdEncargados[1].id,
      categoryId: 'hogar',
      service: 'Instalación eléctrica',
      description: 'Instalación de nuevos puntos de luz',
      address: 'Carrera 45 #67-89, Bogotá',
      date: new Date('2024-04-20'),
      time: '2:00 PM',
      status: OrderStatus.PENDING,
      price: 354.99,
      paymentMethod: 'efectivo',
    },
  ];

  const createdOrders = [];
  for (const order of orders) {
    const createdOrder = await prisma.order.create({ data: order });
    createdOrders.push(createdOrder);
  }

  // Crear reseñas
  console.log('⭐ Creando reseñas...');
  const reviews = [
    {
      orderId: createdOrders[0].id,
      userId: createdUsers[0].id,
      encargadoId: createdEncargados[0].id,
      rating: 5,
      comment: 'Excelente servicio, muy profesional y puntual.',
    },
  ];

  for (const review of reviews) {
    await prisma.review.create({ data: review });
  }

  // Crear algunos favoritos
  console.log('❤️ Creando favoritos...');
  const favorites = [
    {
      userId: createdUsers[0].id,
      encargadoId: createdEncargados[0].id,
    },
    {
      userId: createdUsers[0].id,
      encargadoId: createdEncargados[3].id,
    },
  ];

  for (const favorite of favorites) {
    await prisma.favorite.create({ data: favorite });
  }

  console.log('✅ Seeding completado exitosamente!');
  console.log('\n📊 Datos creados:');
  console.log(`- ${categories.length} categorías`);
  console.log(`- ${users.length} usuarios cliente`);
  console.log(`- ${encargados.length} encargados`);
  console.log(`- ${promotions.length} promociones`);
  console.log(`- ${orders.length} pedidos`);
  console.log(`- ${reviews.length} reseñas`);
  console.log(`- ${favorites.length} favoritos`);
  
  console.log('\n🔑 Credenciales de prueba:');
  console.log('Cliente: jpjimenez94@gmail.com / 123456');
  console.log('Encargados: miguel.paredes@email.com / 123456');
  console.log('           julian.herrera@email.com / 123456');
  console.log('           carolina.lopez@email.com / 123456');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
