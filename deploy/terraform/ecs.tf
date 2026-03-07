# ecs.tf - Container Services on AWS ECS Fargate
#
# ECS (Elastic Container Service) runs your Docker containers in AWS.
#
# KEY CONCEPTS FOR NEWCOMERS:
#
# WHAT IS FARGATE?
#   Fargate is "serverless containers." You do not manage any servers.
#   You just say "run this container with this much CPU and memory"
#   and AWS handles the rest. You pay only for the CPU/memory you use.
#
# WHAT IS A TASK DEFINITION?
#   A task definition is a recipe for running a container. It says:
#   "Use this Docker image, give it this much CPU/memory, set these
#   environment variables, and send logs to this log group."
#   Think of it as a Dockerfile for the cloud.
#
# WHAT IS A SERVICE?
#   A service keeps a specified number of tasks (containers) running.
#   If a container crashes, the service automatically starts a new one.
#   It also connects containers to the load balancer so users can
#   reach them.
#
# WHAT IS ECR?
#   ECR (Elastic Container Registry) stores your Docker images.
#   You build your image locally, push it to ECR, and ECS pulls it
#   from there. Think of it like Docker Hub but private and in your
#   AWS account.
#
# CODE FOR CONNECTION HAS THREE SERVICES:
#   1. api       - The REST API (Express.js, port 3000)
#   2. web       - The frontend web app (served by Node, port 3000)
#   3. signaling - WebRTC signaling server (Socket.IO, port 3001)

# ---------------------------------------------------------------------------
# ECR Repositories
# One repository per service, to store their Docker images.
# ---------------------------------------------------------------------------

resource "aws_ecr_repository" "api" {
  name                 = "${var.app_name}-${var.environment}-api"
  image_tag_mutability = "MUTABLE" # Allows overwriting tags like "latest"
  force_delete         = true      # Allow deletion even if images exist

  # Scan images for known security vulnerabilities on push
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-api"
  }
}

resource "aws_ecr_repository" "web" {
  name                 = "${var.app_name}-${var.environment}-web"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-web"
  }
}

resource "aws_ecr_repository" "signaling" {
  name                 = "${var.app_name}-${var.environment}-signaling"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-signaling"
  }
}

# ---------------------------------------------------------------------------
# ECS Cluster
# A cluster is a logical grouping of services. All three services
# (api, web, signaling) run inside this one cluster.
# ---------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-${var.environment}"

  # Enable Container Insights for monitoring (CPU, memory, network metrics)
  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-cluster"
  }
}

# ---------------------------------------------------------------------------
# IAM Roles
# ECS needs permission to do things like pull Docker images from ECR
# and write logs to CloudWatch. These IAM roles grant those permissions.
# ---------------------------------------------------------------------------

# Task execution role: used by ECS itself to pull images and write logs.
# This is NOT the role your application code uses.
resource "aws_iam_role" "ecs_execution" {
  name = "${var.app_name}-${var.environment}-ecs-execution"

  # This "assume role policy" says: "Only the ECS service can use this role."
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-${var.environment}-ecs-execution"
  }
}

# Attach the standard ECS execution policy (allows pulling images, writing logs)
resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role: used by your application code (e.g., if it needs to call AWS APIs).
# Currently has no extra permissions, but you can add them later.
resource "aws_iam_role" "ecs_task" {
  name = "${var.app_name}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-${var.environment}-ecs-task"
  }
}

# ---------------------------------------------------------------------------
# CloudWatch Log Groups
# All container logs go to CloudWatch so you can view them in the AWS console.
# One log group per service keeps things organized.
# Logs are kept for 30 days to control costs.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.app_name}-${var.environment}/api"
  retention_in_days = 30

  tags = {
    Name = "${var.app_name}-${var.environment}-api-logs"
  }
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${var.app_name}-${var.environment}/web"
  retention_in_days = 30

  tags = {
    Name = "${var.app_name}-${var.environment}-web-logs"
  }
}

resource "aws_cloudwatch_log_group" "signaling" {
  name              = "/ecs/${var.app_name}-${var.environment}/signaling"
  retention_in_days = 30

  tags = {
    Name = "${var.app_name}-${var.environment}-signaling-logs"
  }
}

# ---------------------------------------------------------------------------
# Task Definitions
# Each task definition describes how to run one service's container.
# ---------------------------------------------------------------------------

# --- API Service Task Definition ---
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.app_name}-${var.environment}-api"
  network_mode             = "awsvpc"    # Required for Fargate
  requires_compatibilities = ["FARGATE"] # Run on Fargate (serverless)
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${aws_ecr_repository.api.repository_url}:latest"

      # Port mapping: the container listens on port 3000
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      # Environment variables the application needs
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}"
        },
        {
          name  = "JWT_SECRET"
          value = var.jwt_secret
        },
        {
          name  = "JWT_EXPIRES_IN"
          value = "24h"
        },
        {
          name  = "SIGNALING_URL"
          value = "http://${aws_lb.main.dns_name}/socket.io"
        }
      ]

      # Send all container output to CloudWatch Logs
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      # Health check: ECS will restart the container if this fails
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.app_name}-${var.environment}-api-task"
  }
}

# --- Web Service Task Definition ---
resource "aws_ecs_task_definition" "web" {
  family                   = "${var.app_name}-${var.environment}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "web"
      image = "${aws_ecr_repository.web.repository_url}:latest"

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.web.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name = "${var.app_name}-${var.environment}-web-task"
  }
}

# --- Signaling Service Task Definition ---
resource "aws_ecs_task_definition" "signaling" {
  family                   = "${var.app_name}-${var.environment}-signaling"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "signaling"
      image = "${aws_ecr_repository.signaling.repository_url}:latest"

      # Signaling runs on port 3001 (matching docker-compose.yml)
      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3001"
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:${aws_elasticache_cluster.redis.cache_nodes[0].port}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.signaling.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.app_name}-${var.environment}-signaling-task"
  }
}

# ---------------------------------------------------------------------------
# ECS Services
# Each service ensures a specified number of containers are always running
# and connects them to the load balancer.
#
# desired_count = 1 means "keep one container running at all times."
# Increase this for redundancy or to handle more traffic.
# ---------------------------------------------------------------------------

# --- API Service ---
resource "aws_ecs_service" "api" {
  name            = "${var.app_name}-${var.environment}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Network configuration: run in private subnets, use the ECS security group
  network_configuration {
    subnets          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false # Private subnet, no public IP needed
  }

  # Connect to the load balancer's API target group
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  # Wait for the load balancer listener to be created first
  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.app_name}-${var.environment}-api-service"
  }
}

# --- Web Service ---
resource "aws_ecs_service" "web" {
  name            = "${var.app_name}-${var.environment}-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.app_name}-${var.environment}-web-service"
  }
}

# --- Signaling Service ---
resource "aws_ecs_service" "signaling" {
  name            = "${var.app_name}-${var.environment}-signaling"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.signaling.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_1.id, aws_subnet.private_2.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.signaling.arn
    container_name   = "signaling"
    container_port   = 3001
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.app_name}-${var.environment}-signaling-service"
  }
}
