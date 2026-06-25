#!/bin/bash
# 每次运行自动备份数据库，保留最近 30 个备份
BACKUP_DIR="$(dirname "$0")/../prisma/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp prisma/dev.db "$BACKUP_DIR/dev_${TIMESTAMP}.db"
echo "已备份: $BACKUP_DIR/dev_${TIMESTAMP}.db"

# 全部保留，不删除
