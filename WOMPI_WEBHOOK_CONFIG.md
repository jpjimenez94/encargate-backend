# 📡 Configuración de Webhooks de Wompi

## ¿Qué es un Webhook?

Un webhook es una URL en tu servidor a la que Wompi enviará notificaciones automáticas cuando ocurran eventos importantes (ej: una transacción cambia de estado).

## 🔧 Configuración en Dashboard de Wompi

### Paso 1: Acceder al Dashboard
1. Ingresa a https://comercios.wompi.co/
2. Ve a **"Desarrolladores" → "Eventos"**

### Paso 2: Configurar URL de Webhook

#### Para Desarrollo Local (Sandbox):
```
https://tu-ngrok-url.ngrok.io/api/webhooks/wompi/events
```

#### Para Producción:
```
https://tu-dominio.com/api/webhooks/wompi/events
```

### Paso 3: Probar el Webhook
1. En el dashboard de Wompi, usa la opción **"Probar Webhook"**
2. Wompi enviará un evento de prueba
3. Verifica en los logs de tu backend que se recibió correctamente

## 🧪 Desarrollo Local con ngrok

Como Wompi necesita enviar peticiones HTTP a tu servidor, necesitas exponerlo públicamente:

### 1. Instalar ngrok
```bash
# Windows
choco install ngrok

# O descargar de https://ngrok.com/download
```

### 2. Exponer tu servidor local
```bash
ngrok http 3001
```

### 3. Copiar la URL
```
Forwarding: https://abc123.ngrok.io → http://localhost:3001
```

### 4. Configurar en Wompi
URL del webhook: `https://abc123.ngrok.io/api/webhooks/wompi/events`

## 📋 Eventos que Recibirás

### 1. `transaction.updated`
Se envía cuando una transacción cambia de estado (PENDING → APPROVED, DECLINED, etc.)

**Ejemplo de payload:**
```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "1234-1610641025-49201",
      "status": "APPROVED",
      "amount_in_cents": 4490000,
      "reference": "MZQ3X2DE2SMX",
      "customer_email": "juan.perez@gmail.com",
      "currency": "COP",
      "payment_method_type": "NEQUI"
    }
  },
  "environment": "test",
  "timestamp": 1530291411,
  "sent_at": "2018-07-20T16:45:05.000Z",
  "signature": {
    "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    "checksum": "3476DDA50F64CD7CBD160689640506FEBEA93239BC524FC0469B2C68A3CC8BD0"
  }
}
```

### 2. `nequi_token.updated`
Token de Nequi para pagos recurrentes cambió de estado.

### 3. `bancolombia_transfer_token.updated`
Token de Bancolombia para pagos recurrentes cambió de estado.

## 🔐 Validación de Seguridad

Tu backend **DEBE** validar el checksum de seguridad para evitar ataques:

### Algoritmo de Validación (ya implementado):
1. Extraer valores de `signature.properties`
2. Concatenar timestamp
3. Concatenar `WOMPI_EVENTS_SECRET`
4. Calcular SHA256
5. Comparar con `signature.checksum`

**Esto ya está implementado en `webhooks.service.ts`**

## 📝 Variables de Entorno Requeridas

Asegúrate de tener en tu `.env`:

```env
# Llave pública (para consultas)
WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxxx

# Llave privada (para crear transacciones)
WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxxx

# Secreto de integridad (para firmas SHA256)
WOMPI_INTEGRITY_SECRET=test_integrity_xxxxxxxxxxxxx

# Secreto de eventos (para validar webhooks)
WOMPI_EVENTS_SECRET=test_events_xxxxxxxxxxxxx

# URL del API
WOMPI_API_URL=https://sandbox.wompi.co/v1
```

## 🧪 Probar el Webhook Localmente

### 1. Usar el endpoint de prueba:
```bash
curl -X POST http://localhost:3001/api/webhooks/wompi/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 2. Simular un evento real:
```bash
curl -X POST http://localhost:3001/api/webhooks/wompi/events \
  -H "Content-Type: application/json" \
  -H "x-event-checksum: TEST_CHECKSUM" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "test-123",
        "status": "APPROVED",
        "amount_in_cents": 100000,
        "reference": "test-ref"
      }
    },
    "timestamp": 1234567890
  }'
```

## 🔍 Debugging

### Ver logs del webhook:
Los logs aparecerán en la consola del backend:

```
[WebhooksController] 📨 Webhook recibido de Wompi: transaction.updated
[WebhooksService] ✅ Checksum validado correctamente
[WebhooksService] ✅ Pedido ABC123 actualizado a ACCEPTED con pago PAID
```

### Errores comunes:

1. **"Checksum inválido"**
   - Verifica que `WOMPI_EVENTS_SECRET` esté configurado correctamente
   - En desarrollo, puedes desactivar temporalmente la validación

2. **"No se encontró pedido"**
   - El `paymentIntentId` del pedido debe coincidir con el `transaction.id` de Wompi

3. **Wompi no envía eventos**
   - Verifica que la URL del webhook esté configurada en el dashboard
   - Verifica que tu servidor esté accesible públicamente (usa ngrok en desarrollo)

## 🚀 Producción

### Consideraciones importantes:

1. **HTTPS obligatorio**: Wompi solo enviará webhooks a URLs HTTPS
2. **Responder 200**: Siempre devuelve status 200, incluso si hay errores internos
3. **Idempotencia**: Wompi puede enviar el mismo evento múltiples veces
4. **Timeout**: Responde en menos de 30 segundos
5. **Reintentos**: Wompi reintentará 3 veces (30min, 3h, 24h) si no recibe 200

### Ejemplo de deployment:

**Railway/Heroku:**
```
https://tu-app.railway.app/api/webhooks/wompi/events
```

**Vercel (requiere edge function):**
```
https://tu-app.vercel.app/api/webhooks/wompi/events
```

## ✅ Checklist de Implementación

- [x] Módulo de webhooks creado (`WebhooksModule`)
- [x] Controlador de webhooks implementado (`WebhooksController`)
- [x] Servicio de webhooks con validación (`WebhooksService`)
- [x] Validación de checksum de seguridad
- [x] Manejo de eventos `transaction.updated`
- [x] Actualización automática de pedidos
- [x] Notificaciones en tiempo real a usuarios
- [ ] Configurar URL del webhook en dashboard de Wompi
- [ ] Probar con transacciones reales en Sandbox
- [ ] Configurar webhook de producción antes de lanzar

## 📚 Recursos

- [Documentación oficial de Webhooks de Wompi](https://docs.wompi.co/docs/es/eventos)
- [Ngrok - Exponer servidor local](https://ngrok.com/)
- [Dashboard de Wompi](https://comercios.wompi.co/)
