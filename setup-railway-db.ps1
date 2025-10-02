# Script para configurar la base de datos de Railway
# Uso: .\setup-railway-db.ps1 "postgresql://postgres:PASSWORD@HOST:PORT/railway"

param(
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl
)

Write-Host "🚀 Configurando base de datos de Railway..." -ForegroundColor Green

# Configurar variable de entorno temporalmente
$env:DATABASE_URL = $DatabaseUrl

Write-Host "📦 Ejecutando migraciones de Prisma..." -ForegroundColor Yellow
npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migraciones ejecutadas exitosamente" -ForegroundColor Green
    
    Write-Host "🌱 Ejecutando seed de datos..." -ForegroundColor Yellow
    npx prisma db seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Seed ejecutado exitosamente" -ForegroundColor Green
        Write-Host "🎉 Base de datos configurada correctamente!" -ForegroundColor Green
    } else {
        Write-Host "❌ Error ejecutando seed" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Error ejecutando migraciones" -ForegroundColor Red
}

# Limpiar variable de entorno
Remove-Item Env:\DATABASE_URL
