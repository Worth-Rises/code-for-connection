# rds.tf - PostgreSQL Database on AWS RDS
#
# RDS (Relational Database Service) is a managed database. AWS handles
# backups, patching, and hardware failures so you do not have to.
#
# WHY IS IT IN A PRIVATE SUBNET?
# The database contains sensitive data (user accounts, call records,
# messages). Putting it in a private subnet means it has no public IP
# address, so nobody on the internet can even attempt to connect to it.
# Only the ECS containers (which are in the same VPC) can reach it.
#
# HOW DO THE CONTAINERS CONNECT?
# ECS containers use the DATABASE_URL environment variable, which
# contains the RDS endpoint (hostname), port, username, and password.
# Because they are in the same VPC and the security group allows it,
# the connection works just like connecting to a local database.
#
# WHAT DOES db.t3.micro MEAN?
# "db" = it is a database instance
# "t3"  = the instance family (burstable, good for variable workloads)
# "micro" = the size (1 vCPU, 1 GB RAM, ~$15/month)
# For production with real users, consider db.t3.small or db.t3.medium.

# ---------------------------------------------------------------------------
# Subnet Group
# Tells RDS which subnets it can use. RDS requires at least two subnets
# in different availability zones (for failover capability).
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name = "${var.app_name}-${var.environment}-db-subnet"

  # Use both private subnets so the database has failover options
  subnet_ids = [
    aws_subnet.private_1.id,
    aws_subnet.private_2.id,
  ]

  description = "Private subnets for the ${var.app_name} database"

  tags = {
    Name = "${var.app_name}-${var.environment}-db-subnet"
  }
}

# ---------------------------------------------------------------------------
# PostgreSQL Database Instance
# ---------------------------------------------------------------------------

resource "aws_db_instance" "postgres" {
  # Unique name for this database instance in AWS
  identifier = "${var.app_name}-${var.environment}-db"

  # Database engine and version
  # PostgreSQL 16 matches the docker-compose.yml development setup
  engine         = "postgres"
  engine_version = "16"

  # Instance size (see variable description for what this means)
  instance_class = var.db_instance_class

  # Storage: start with 20 GB, let it grow up to 100 GB automatically
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3" # General Purpose SSD, good balance of cost and speed

  # Database name, username, and password
  # These become part of the DATABASE_URL connection string
  db_name  = "codeforconnection"
  username = "c4c_admin"
  password = var.db_password

  # Network: put it in private subnets, lock it down with security group
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # IMPORTANT: Do NOT make the database publicly accessible.
  # This is the most critical security setting for the database.
  publicly_accessible = false

  # Backups: keep 7 days of automatic backups
  # If something goes wrong, you can restore to any point in the last week
  backup_retention_period = 7
  backup_window           = "03:00-04:00" # Run backups at 3 AM UTC (low traffic)

  # Maintenance window for AWS to apply patches
  maintenance_window = "Mon:04:00-Mon:05:00"

  # Skip the final snapshot when destroying (set to false for real production)
  # For initial setup and testing, this avoids errors when tearing down
  skip_final_snapshot = true

  # Apply changes immediately instead of waiting for the maintenance window
  # Useful during initial setup; consider setting to false for production
  apply_immediately = true

  tags = {
    Name = "${var.app_name}-${var.environment}-db"
  }
}
