#!/bin/bash
# ============================================================
# Google Ads Deployment Setup Script
# Run this ON the droplet to install everything
# ============================================================

echo ""
echo "═══════════════════════════════════════════════════"
echo "  First Unicorn — Google Ads Setup"
echo "═══════════════════════════════════════════════════"
echo ""

# Create directory
DEPLOY_DIR="/root/unicorn-sovereign/google-ads"
mkdir -p "$DEPLOY_DIR"

# Copy files
echo "📁 Setting up files..."
cp deploy.js "$DEPLOY_DIR/"
cp monitor.js "$DEPLOY_DIR/"
cp campaign-config.json "$DEPLOY_DIR/"
echo "✅ Files copied to $DEPLOY_DIR"

# Create .env loader wrapper
cat > "$DEPLOY_DIR/run-deploy.sh" << 'WRAPPER'
#!/bin/bash
cd /root/unicorn-sovereign/google-ads
set -a
source /root/unicorn-sovereign/.env 2>/dev/null
set +a
node deploy.js "$@"
WRAPPER
chmod +x "$DEPLOY_DIR/run-deploy.sh"

cat > "$DEPLOY_DIR/run-monitor.sh" << 'WRAPPER'
#!/bin/bash
cd /root/unicorn-sovereign/google-ads
set -a
source /root/unicorn-sovereign/.env 2>/dev/null
set +a
node monitor.js "$@"
WRAPPER
chmod +x "$DEPLOY_DIR/run-monitor.sh"

echo "✅ Wrapper scripts created"

# Add monitor cron job (8am GST daily = 4am UTC)
CRON_LINE="0 4 * * * /root/unicorn-sovereign/google-ads/run-monitor.sh >> /root/unicorn-sovereign/google-ads/monitor.log 2>&1"

# Check if already exists
if crontab -l 2>/dev/null | grep -q "run-monitor.sh"; then
    echo "ℹ️  Monitor cron job already exists"
else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "✅ Cron job added: Daily 8am GST (4am UTC)"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ SETUP COMPLETE"
echo "═══════════════════════════════════════════════════"
echo ""
echo "To deploy campaigns:"
echo "  $DEPLOY_DIR/run-deploy.sh"
echo ""
echo "To run monitor manually:"
echo "  $DEPLOY_DIR/run-monitor.sh"
echo ""
echo "Monitor runs automatically daily at 8am GST"
echo ""
echo "IMPORTANT: Campaign deploys in PAUSED state."
echo "Complete these first:"
echo "  1. Set up conversion tracking in Google Ads"
echo "  2. Add payment method in ads.google.com"
echo "  3. Then enable the campaign"
echo ""
