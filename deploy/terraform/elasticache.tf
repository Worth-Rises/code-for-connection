# elasticache.tf - Redis Cache on AWS ElastiCache
#
# ElastiCache is a managed Redis (or Memcached) service. AWS handles
# the server, patching, and failover so you do not have to.
#
# WHAT DOES REDIS DO IN THIS APPLICATION?
# Redis serves two purposes for Code for Connection:
#   1. Session storage: keeps track of who is logged in
#   2. Real-time signaling: coordinates WebRTC video/voice connections
#      between the signaling service instances
#
# WHY IS IT IN A PRIVATE SUBNET?
# Same reason as the database: Redis should never be exposed to the
# internet. It has no authentication by default, so public access
# would be a serious security risk.
#
# WHAT DOES cache.t3.micro MEAN?
# "cache" = it is a cache instance
# "t3"    = the instance family (burstable)
# "micro" = the size (0.5 GB RAM, ~$12/month)
# Redis is very memory-efficient, so micro is fine for moderate usage.

# ---------------------------------------------------------------------------
# Subnet Group
# Tells ElastiCache which subnets it can use.
# ---------------------------------------------------------------------------

resource "aws_elasticache_subnet_group" "main" {
  name = "${var.app_name}-${var.environment}-redis-subnet"

  # Use both private subnets
  subnet_ids = [
    aws_subnet.private_1.id,
    aws_subnet.private_2.id,
  ]

  description = "Private subnets for the ${var.app_name} Redis cache"

  tags = {
    Name = "${var.app_name}-${var.environment}-redis-subnet"
  }
}

# ---------------------------------------------------------------------------
# Redis Cluster
# Despite the name "cluster," this creates a single Redis node.
# A true cluster (with replicas) costs more but provides failover.
# For now, a single node is fine for development and low traffic.
# ---------------------------------------------------------------------------

resource "aws_elasticache_cluster" "redis" {
  cluster_id = "${var.app_name}-${var.environment}-redis"

  # Redis 7 matches the docker-compose.yml development setup
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1      # Single node (increase for redundancy)
  port                 = 6379   # Standard Redis port
  parameter_group_name = "default.redis7"

  # Network: private subnets only, locked down by security group
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Maintenance window for patches (pick a low-traffic time)
  maintenance_window = "Tue:04:00-Tue:05:00"

  # Snapshot (backup) settings
  # Redis snapshots let you restore data if something goes wrong
  snapshot_retention_limit = 3 # Keep 3 days of snapshots
  snapshot_window          = "02:00-03:00"

  tags = {
    Name = "${var.app_name}-${var.environment}-redis"
  }
}
