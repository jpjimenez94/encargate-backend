# Script para actualizar el puerto del backend a 3002

Write-Host "🔧 Actualizando puerto del backend a 3002..." -ForegroundColor Green

# URL de la base de datos de Railway
$DATABASE_URL = "postgresql://postgres:ZFKWXwmpvcDLeYHKzBXtFcNvIufMpZnX@switchback.proxy.rlwy.net:20794/railway"

# Crear o actualizar archivo .env con puerto 3002
$envContent = @"
# Database
DATABASE_URL=$DATABASE_URL

# JWT Configuration
JWT_SECRET=encargate_super_secret_key_2024
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3002
NODE_ENV=development

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:3000
"@

# Guardar en .env
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -Force

Write-Host "✅ Puerto actualizado a 3002" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Backend: http://localhost:3002" -ForegroundColor Magenta
Write-Host "📚 API Docs: http://localhost:3002/api/docs" -ForegroundColor Magenta
Write-Host ""
Write-Host "⚠️  Recuerda reiniciar el backend para aplicar cambios" -ForegroundColor Yellow
