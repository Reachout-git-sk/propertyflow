# PropertyFlow Frontend - Complete Builder Script for Windows
# Run this in PowerShell from D:\projects\PropertyFlow\frontend

Write-Host "🚀 Building Complete PropertyFlow Frontend..." -ForegroundColor Green
Write-Host "=" -NoNewline; Write-Host ("=" * 70)

$ErrorActionPreference = "Stop"

# Step 1: Clean and create structure
Write-Host "`n📁 Creating directory structure..." -ForegroundColor Yellow

$folders = @(
    "src\components\ui",
    "src\components\layout",
    "src\components\tenant",
    "src\components\admin", 
    "src\components\worker",
    "src\pages",
    "src\hooks",
    "src\services",
    "src\store",
    "src\types",
    "src\utils"
)

foreach ($folder in $folders) {
    if (!(Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  ✓ Created: $folder" -ForegroundColor Green
    }
}

Write-Host "`n✅ Directory structure ready!" -ForegroundColor Green
Write-Host "`n📝 Next: Copy all .tsx and .ts files from the provided package" -ForegroundColor Yellow
Write-Host "   All files are ready in the ZIP archive" -ForegroundColor Yellow

Write-Host "`n" -NoNewline; Write-Host ("=" * 70)
Write-Host "✅ Frontend structure created successfully!" -ForegroundColor Green
