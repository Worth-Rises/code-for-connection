# main.tf - Network Infrastructure
#
# Creates the network for Code for Connection.
# Think of this like building the office before putting people in it:
#   - VPC = the building (an isolated network)
#   - Subnets = floors (public ones face the internet, private ones don't)
#   - Security groups = locked doors (only specific traffic gets through)
#
# Why two of each subnet? AWS requires resources in at least two
# "Availability Zones" (physically separate data centers) for reliability.
# If one data center has problems, the other keeps running.

# ---------------------------------------------------------------------------
# Terraform and Provider Configuration
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Tags applied to every resource automatically.
  # This makes cost tracking and cleanup much easier.
  default_tags {
    tags = {
      Project     = var.app_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ---------------------------------------------------------------------------
# Data Sources
# These look up information about the AWS region we are deploying into.
# ---------------------------------------------------------------------------

# Get the list of availability zones in our region.
# For example, us-east-1 has us-east-1a, us-east-1b, us-east-1c, etc.
# We only need two for redundancy.
data "aws_availability_zones" "available" {
  state = "available"
}

# ---------------------------------------------------------------------------
# VPC (Virtual Private Cloud)
# The VPC is your own private network inside AWS. Nothing outside it can
# reach your resources unless you explicitly allow it.
# ---------------------------------------------------------------------------

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16" # Gives us 65,536 private IP addresses

  # These two settings let resources inside the VPC find each other by name
  # instead of IP address (like a phone book for your network).
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.app_name}-${var.environment}-vpc"
  }
}

# ---------------------------------------------------------------------------
# Subnets
# Subnets divide the VPC into smaller sections.
# PUBLIC subnets: can reach the internet and be reached from it.
#   Used for: load balancers, NAT gateways.
# PRIVATE subnets: cannot be reached from the internet directly.
#   Used for: databases, application containers, Redis.
# ---------------------------------------------------------------------------

# --- Public Subnets (two, in different availability zones) ---

resource "aws_subnet" "public_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24" # 256 IP addresses
  availability_zone = data.aws_availability_zones.available.names[0]

  # Instances launched here get a public IP automatically
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.app_name}-${var.environment}-public-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.app_name}-${var.environment}-public-2"
  }
}

# --- Private Subnets (two, in different availability zones) ---
# These are where the important stuff lives: databases, app containers, Redis.
# They are isolated from direct internet access for security.

resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${var.app_name}-${var.environment}-private-1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name = "${var.app_name}-${var.environment}-private-2"
  }
}

# ---------------------------------------------------------------------------
# Internet Gateway
# This is the "front door" of the building. It connects the VPC to the
# public internet. Without it, nothing in the VPC can reach the outside world.
# ---------------------------------------------------------------------------

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.app_name}-${var.environment}-igw"
  }
}

# ---------------------------------------------------------------------------
# NAT Gateway
# The NAT gateway lets resources in PRIVATE subnets reach the internet
# (for software updates, API calls, etc.) WITHOUT being reachable FROM
# the internet. Think of it as a one-way door: traffic can go out but
# strangers cannot come in.
#
# NAT gateways need a public IP address (called an "Elastic IP").
# Note: NAT gateways cost about $32/month. For dev environments, you
# could remove this and put containers in public subnets to save money.
# ---------------------------------------------------------------------------

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.app_name}-${var.environment}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1.id # NAT gateway lives in a public subnet

  tags = {
    Name = "${var.app_name}-${var.environment}-nat-gw"
  }

  # The NAT gateway needs the internet gateway to exist first
  depends_on = [aws_internet_gateway.main]
}

# ---------------------------------------------------------------------------
# Route Tables
# Route tables are like a GPS for network traffic. They tell packets
# where to go. Public subnets route to the internet gateway; private
# subnets route through the NAT gateway.
# ---------------------------------------------------------------------------

# --- Public Route Table ---
# "Any traffic going to the internet (0.0.0.0/0) should use the internet gateway."
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-public-rt"
  }
}

# Connect public subnets to the public route table
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# --- Private Route Table ---
# "Any traffic going to the internet (0.0.0.0/0) should use the NAT gateway."
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-private-rt"
  }
}

# Connect private subnets to the private route table
resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}

# ---------------------------------------------------------------------------
# Security Groups
# Security groups are firewalls for individual resources. Each one lists
# which traffic is allowed in (ingress) and out (egress). If traffic
# is not explicitly allowed, it is blocked.
# ---------------------------------------------------------------------------

# --- ALB Security Group ---
# The Application Load Balancer is the only thing that faces the internet.
# It accepts HTTP traffic on port 80 from anywhere.
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-${var.environment}-alb-sg"
  description = "Controls traffic to the load balancer"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP from anywhere on the internet
  ingress {
    description = "HTTP from the internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS from anywhere (for when you add a TLS certificate)
  ingress {
    description = "HTTPS from the internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic (so the ALB can forward requests to containers)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-alb-sg"
  }
}

# --- ECS Security Group ---
# The application containers only accept traffic from the load balancer.
# They should never be accessed directly from the internet.
resource "aws_security_group" "ecs" {
  name        = "${var.app_name}-${var.environment}-ecs-sg"
  description = "Controls traffic to ECS containers"
  vpc_id      = aws_vpc.main.id

  # Allow traffic from the ALB on the app port range (3000-3001)
  ingress {
    description     = "Traffic from the load balancer"
    from_port       = 3000
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all outbound traffic (containers need to reach the database, Redis,
  # and the internet for external API calls like Twilio)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-ecs-sg"
  }
}

# --- RDS Security Group ---
# The database ONLY accepts connections from the ECS containers.
# No internet access, no direct connections from your laptop.
resource "aws_security_group" "rds" {
  name        = "${var.app_name}-${var.environment}-rds-sg"
  description = "Controls traffic to the PostgreSQL database"
  vpc_id      = aws_vpc.main.id

  # Allow PostgreSQL connections (port 5432) only from ECS containers
  ingress {
    description     = "PostgreSQL from ECS containers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-rds-sg"
  }
}

# --- Redis Security Group ---
# Redis ONLY accepts connections from the ECS containers.
# Same idea as the database: no public access.
resource "aws_security_group" "redis" {
  name        = "${var.app_name}-${var.environment}-redis-sg"
  description = "Controls traffic to the Redis cache"
  vpc_id      = aws_vpc.main.id

  # Allow Redis connections (port 6379) only from ECS containers
  ingress {
    description     = "Redis from ECS containers"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-redis-sg"
  }
}
