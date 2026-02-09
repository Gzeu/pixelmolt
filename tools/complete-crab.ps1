# Complete missing crab pixels (slower, no rate limits)
$API = "http://localhost:3100/api/pixel"
$CANVAS_ID = "default"

$Agents = @("CrabMaster", "ClawPainter", "ShellArtist", "MoltDrawer", "PinchBot", "RedClaw")

$RED = "#FF4444"
$DARK_RED = "#CC2222"  
$ORANGE = "#FF8844"
$BLACK = "#111111"
$WHITE = "#FFFFFF"

$StartX = 100
$StartY = 100

# Missing/key pixels for a clearer crab shape
$CrabPixels = @(
    # Eyes (important!)
    @(11, 5, $BLACK), @(12, 4, $BLACK), @(12, 5, $WHITE),
    @(15, 5, $BLACK), @(14, 4, $BLACK), @(14, 5, $WHITE),
    
    # Body fill
    @(10, 7, $ORANGE), @(11, 7, $ORANGE), @(12, 7, $ORANGE), @(13, 7, $ORANGE), @(14, 7, $ORANGE), @(15, 7, $ORANGE), @(16, 7, $ORANGE),
    @(9, 8, $ORANGE), @(10, 8, $ORANGE), @(11, 8, $ORANGE), @(12, 8, $ORANGE), @(13, 8, $ORANGE), @(14, 8, $ORANGE), @(15, 8, $ORANGE), @(16, 8, $ORANGE), @(17, 8, $ORANGE),
    @(9, 9, $ORANGE), @(10, 9, $ORANGE), @(11, 9, $RED), @(12, 9, $RED), @(13, 9, $RED), @(14, 9, $RED), @(15, 9, $RED), @(16, 9, $ORANGE), @(17, 9, $ORANGE),
    @(10, 10, $RED), @(11, 10, $RED), @(12, 10, $RED), @(13, 10, $RED), @(14, 10, $RED), @(15, 10, $RED), @(16, 10, $RED),
    
    # Shell outline
    @(8, 8, $RED), @(9, 7, $RED), @(10, 6, $RED), @(11, 6, $RED), @(12, 6, $RED), @(13, 6, $RED), @(14, 6, $RED), @(15, 6, $RED), @(16, 6, $RED), @(17, 7, $RED), @(18, 8, $RED),
    @(8, 9, $RED), @(18, 9, $RED),
    @(8, 10, $RED), @(18, 10, $RED),
    @(9, 11, $RED), @(17, 11, $RED),
    @(10, 11, $RED), @(11, 11, $RED), @(12, 11, $RED), @(13, 11, $RED), @(14, 11, $RED), @(15, 11, $RED), @(16, 11, $RED),
    
    # Left claw
    @(0, 8, $RED), @(1, 7, $RED), @(1, 8, $RED), @(1, 9, $RED),
    @(2, 6, $RED), @(2, 7, $DARK_RED), @(2, 8, $DARK_RED), @(2, 9, $RED), @(2, 10, $RED),
    @(3, 5, $RED), @(3, 6, $DARK_RED), @(3, 7, $RED), @(3, 9, $RED), @(3, 10, $RED),
    @(4, 5, $RED), @(4, 6, $RED), @(4, 10, $RED),
    @(5, 6, $RED), @(5, 7, $RED), @(5, 8, $RED), @(5, 9, $RED),
    @(6, 8, $RED), @(6, 9, $RED), @(7, 8, $RED), @(7, 9, $RED),
    
    # Right claw  
    @(26, 8, $RED), @(25, 7, $RED), @(25, 8, $RED), @(25, 9, $RED),
    @(24, 6, $RED), @(24, 7, $DARK_RED), @(24, 8, $DARK_RED), @(24, 9, $RED), @(24, 10, $RED),
    @(23, 5, $RED), @(23, 6, $DARK_RED), @(23, 7, $RED), @(23, 9, $RED), @(23, 10, $RED),
    @(22, 5, $RED), @(22, 6, $RED), @(22, 10, $RED),
    @(21, 6, $RED), @(21, 7, $RED), @(21, 8, $RED), @(21, 9, $RED),
    @(20, 8, $RED), @(20, 9, $RED), @(19, 8, $RED), @(19, 9, $RED),
    
    # Legs
    @(6, 10, $DARK_RED), @(5, 11, $DARK_RED), @(4, 12, $DARK_RED), @(3, 13, $DARK_RED),
    @(6, 11, $DARK_RED), @(5, 12, $DARK_RED), @(4, 13, $DARK_RED),
    @(7, 11, $DARK_RED), @(6, 12, $DARK_RED), @(5, 13, $DARK_RED),
    @(7, 12, $DARK_RED), @(6, 13, $DARK_RED),
    
    @(20, 10, $DARK_RED), @(21, 11, $DARK_RED), @(22, 12, $DARK_RED), @(23, 13, $DARK_RED),
    @(20, 11, $DARK_RED), @(21, 12, $DARK_RED), @(22, 13, $DARK_RED),
    @(19, 11, $DARK_RED), @(20, 12, $DARK_RED), @(21, 13, $DARK_RED),
    @(19, 12, $DARK_RED), @(20, 13, $DARK_RED)
)

Write-Host "🦀 Completing crab pixels..." -ForegroundColor Cyan

$placed = 0
foreach ($pixel in $CrabPixels) {
    $x = $StartX + $pixel[0]
    $y = $StartY + $pixel[1]
    $color = $pixel[2]
    $agent = $Agents | Get-Random
    
    $body = @{ canvasId = $CANVAS_ID; x = $x; y = $y; color = $color; agentId = $agent } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $API -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue
        if ($response.success) { $placed++ }
    } catch {}
    
    Start-Sleep -Milliseconds 150  # Slower to avoid rate limits
}

Write-Host "Done! Placed $placed pixels" -ForegroundColor Green
