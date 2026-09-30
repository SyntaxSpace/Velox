# Velox Demo Startup Script (PowerShell)
# Starts PostgreSQL, Backend, Frontend, and Windows Agent in sequence

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       VELOX DEMO ENVIRONMENT STARTUP SEQUENCE                  " -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# 1. Verify PostgreSQL
Write-Host "[1/4] Checking PostgreSQL daemon on port 5432..." -ForegroundColor Yellow
$pgRunning = $false
try {
    $tcp = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
    $pgRunning = $tcp.TcpTestSucceeded
} catch {
    $pgRunning = $false
}

if (-not $pgRunning) {
    Write-Host "  Starting PostgreSQL daemon in background..." -ForegroundColor Gray
    Start-Process -FilePath node -ArgumentList "scripts/start-postgres.js" -WindowStyle Hidden
    Start-Sleep -Seconds 4
}
Write-Host "  ✓ PostgreSQL is ACTIVE on port 5432.`n" -ForegroundColor Green

# 2. Database Migrations & Seeding
Write-Host "[2/4] Ensuring database schema and canonical demo data..." -ForegroundColor Yellow
npm run db:migrate --silent
npm run db:seed --silent
Write-Host "  ✓ Database ready with Velox Demo Shop & VELOX-DEMO-AGENT-01.`n" -ForegroundColor Green

# 3. Services guidance
Write-Host "[3/4] Launching Services:" -ForegroundColor Yellow
Write-Host "  Terminal 1: npm run dev:backend" -ForegroundColor White
Write-Host "  Terminal 2: npm run dev:frontend" -ForegroundColor White
Write-Host "  Terminal 3: npm run dev:agent" -ForegroundColor White

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "VELOX DEMO ENVIRONMENT IS READY!" -ForegroundColor Green
Write-Host "  - Partner Portal:     http://localhost:3000/partner/login" -ForegroundColor White
Write-Host "  - Shop Owner Portal:  http://localhost:3000/shop-owner/login" -ForegroundColor White
Write-Host "  - Customer QR Shop:   http://localhost:3000/shop/shop_demo_velox" -ForegroundColor White
Write-Host "  - Health Check:       http://localhost:5000/api/v1/health" -ForegroundColor White
Write-Host "================================================================`n" -ForegroundColor Green
