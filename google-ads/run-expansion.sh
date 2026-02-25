#!/bin/bash
cd /root/unicorn-sovereign/google-ads
set -a
source /root/unicorn-sovereign/.env 2>/dev/null
set +a
node deploy-expansion.cjs "$@"
