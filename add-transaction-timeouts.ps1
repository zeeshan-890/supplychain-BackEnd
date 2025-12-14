# Script to add transaction timeout configs to all Prisma transaction calls

$files = @(
    "services\order.service.js",
    "services\orderLeg.service.js",
    "services\supplier.service.js",
    "services\distributor.service.js",
    "services\auth.service.js",
    "services\verification.service.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file..."
        
        $content = Get-Content $file -Raw
        
        # Pattern to match: return await prisma.$transaction(async (tx) => { ... });
        # Replace with: return await prisma.$transaction(async (tx) => { ... }, { maxWait: 15000, timeout: 15000 });
        
        # Match transactions that don't already have timeout config
        $pattern = '(return await prisma\.\$transaction\(async \(tx\) => \{[\s\S]*?\n  \}\));'
        $replacement = '$1, {' + "`n" + '    maxWait: 15000,' + "`n" + '    timeout: 15000' + "`n" + '  });'
        
        $newContent = $content -replace $pattern, $replacement
        
        # Also handle transactions without return
        $pattern2 = '(await prisma\.\$transaction\(async \(tx\) => \{[\s\S]*?\n  \}\));'
        $replacement2 = '$1, {' + "`n" + '    maxWait: 15000,' + "`n" + '    timeout: 15000' + "`n" + '  });'
        
        $newContent = $newContent -replace $pattern2, $replacement2
        
        Set-Content $file $newContent -NoNewline
        Write-Host "Updated $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Done!"
