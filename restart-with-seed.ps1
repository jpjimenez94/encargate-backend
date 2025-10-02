Write-Host "🛑 Deteniendo backend..." -ForegroundColor Yellow
# No podemos detener el proceso desde aquí, hazlo con Ctrl+C

Write-Host "`n🔄 Regenerando Prisma Client..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🌱 Ejecutando seed..." -ForegroundColor Cyan
    npx ts-node prisma/seed.ts
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Seed completado exitosamente!" -ForegroundColor Green
        Write-Host "`n🚀 Iniciando backend..." -ForegroundColor Cyan
        npm run start:dev
    } else {
        Write-Host "`n❌ Error al ejecutar el seed" -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Error al regenerar Prisma Client" -ForegroundColor Red
}
