# outputs.tf - Values Displayed After Deployment
#
# After you run "terraform apply," these values are printed to the screen.
# They tell you how to access the deployed application and its services.
# You can also retrieve them later with "terraform output."

# ---------------------------------------------------------------------------
# Application URL
# ---------------------------------------------------------------------------

output "alb_url" {
  description = "The URL of the application. Open this in a browser to access Code for Connection."
  value       = "http://${aws_lb.main.dns_name}"
}

output "alb_dns_name" {
  description = "The raw DNS name of the load balancer (without http://). Use this when configuring a custom domain."
  value       = aws_lb.main.dns_name
}

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

output "rds_endpoint" {
  description = "The database connection endpoint (hostname:port). Used in DATABASE_URL. Only accessible from within the VPC."
  value       = aws_db_instance.postgres.endpoint
}

output "rds_database_name" {
  description = "The name of the PostgreSQL database."
  value       = aws_db_instance.postgres.db_name
}

# ---------------------------------------------------------------------------
# Redis
# ---------------------------------------------------------------------------

output "redis_endpoint" {
  description = "The Redis cache endpoint (hostname). Used in REDIS_URL. Only accessible from within the VPC."
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "The port Redis is listening on (usually 6379)."
  value       = aws_elasticache_cluster.redis.cache_nodes[0].port
}

# ---------------------------------------------------------------------------
# ECR Repositories (for pushing Docker images)
# ---------------------------------------------------------------------------

output "ecr_api_url" {
  description = "ECR repository URL for the API service. Push your API Docker image here."
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_url" {
  description = "ECR repository URL for the web service. Push your web Docker image here."
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_signaling_url" {
  description = "ECR repository URL for the signaling service. Push your signaling Docker image here."
  value       = aws_ecr_repository.signaling.repository_url
}
