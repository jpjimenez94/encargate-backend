Write-Host "🔧 Regenerando Prisma Client..." -ForegroundColor Cyan
npx prisma generate

Write-Host "`n✅ Prisma Client regenerado exitosamente!" -ForegroundColor Green
Write-Host "`n📝 Verificando cambios en Git..." -ForegroundColor Cyan
git status

Write-Host "`n¿Deseas continuar con el commit? (Presiona Enter para continuar)" -ForegroundColor Yellow
Read-Host
