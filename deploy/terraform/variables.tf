# variables.tf - Input Variables
#
# This file defines every configurable value for the infrastructure.
# Think of variables like a form you fill out before building anything.
# Some have sensible defaults; others (like passwords) you must provide.
#
# To set variables, create a file called terraform.tfvars with lines like:
#   db_password = "your-secure-password"
#   jwt_secret  = "your-jwt-secret"
#
# NEVER commit terraform.tfvars to version control (it contains secrets).

# ---------------------------------------------------------------------------
# General Settings
# ---------------------------------------------------------------------------

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Which AWS region to deploy into. us-east-1 (Virginia) is the cheapest and has the most services available. Change this if your users are primarily in another region."
}

variable "environment" {
  type        = string
  default     = "production"
  description = "The deployment environment name (e.g. production, staging, dev). This gets added to resource names so you can tell environments apart."
}

variable "app_name" {
  type        = string
  default     = "code-for-connection"
  description = "A short name for the application. Used as a prefix for all AWS resource names so they are easy to find in the AWS console."
}

# ---------------------------------------------------------------------------
# Database Settings
# ---------------------------------------------------------------------------

variable "db_instance_class" {
  type        = string
  default     = "db.t3.micro"
  description = "The size of the database server. db.t3.micro is the smallest (1 vCPU, 1 GB RAM) and costs about $15/month. For heavier usage, try db.t3.small (2 GB RAM) or db.t3.medium (4 GB RAM)."
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "The password for the PostgreSQL database. Must be at least 8 characters. This is marked 'sensitive' so Terraform will not show it in logs. You MUST set this in terraform.tfvars or via the -var flag."
}

# ---------------------------------------------------------------------------
# Authentication Settings
# ---------------------------------------------------------------------------

variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "A secret string used to sign authentication tokens (JWTs). Should be a long random string (32+ characters). Keep this secret; anyone with it can forge login tokens."
}

# ---------------------------------------------------------------------------
# Redis (Cache/Session Store) Settings
# ---------------------------------------------------------------------------

variable "redis_node_type" {
  type        = string
  default     = "cache.t3.micro"
  description = "The size of the Redis cache server. cache.t3.micro (0.5 GB RAM) is the smallest and cheapest option, around $12/month. Redis stores session data and handles real-time signaling coordination."
}

# ---------------------------------------------------------------------------
# Container (ECS) Settings
# ---------------------------------------------------------------------------

variable "container_cpu" {
  type        = number
  default     = 256
  description = "CPU units for each container. 256 = 0.25 vCPU, 512 = 0.5 vCPU, 1024 = 1 vCPU. 256 is fine for low traffic. In AWS Fargate, 256 CPU units is the smallest option."
}

variable "container_memory" {
  type        = number
  default     = 512
  description = "Memory (in MB) for each container. 512 MB is the minimum for 256 CPU units. If containers crash with out-of-memory errors, increase this to 1024."
}
