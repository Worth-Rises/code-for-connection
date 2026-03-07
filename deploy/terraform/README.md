# Code for Connection: AWS Infrastructure

This Terraform configuration deploys the full Code for Connection platform to AWS. It creates a private network, sets up a PostgreSQL database and Redis cache, runs three containerized services (API, web frontend, and WebRTC signaling) on AWS Fargate, and puts an Application Load Balancer in front of everything to route traffic to the right service.

## What Each File Does

- **variables.tf** - Defines every input you can configure (region, instance sizes, passwords).
- **main.tf** - Creates the network: VPC, subnets, internet gateway, NAT gateway, route tables, security groups.
- **rds.tf** - Creates the PostgreSQL database in a private subnet.
- **elasticache.tf** - Creates the Redis cache in a private subnet.
- **ecs.tf** - Creates ECR image repositories, the ECS cluster, task definitions, and services for all three apps.
- **alb.tf** - Creates the Application Load Balancer and routes traffic by URL path.
- **outputs.tf** - Prints useful values after deployment (URLs, endpoints).

## Prerequisites

1. **An AWS account** with permissions to create VPCs, ECS, RDS, ElastiCache, and ALBs.
2. **Terraform** version 1.0 or later. Install from https://developer.hashicorp.com/terraform/install
3. **AWS CLI** configured with your credentials. Run `aws configure` and enter your access key, secret key, and region.
4. **Docker** installed locally, for building and pushing container images.

## Deploy Commands

```bash
# 1. Create a file with your secrets (NEVER commit this file)
cat > terraform.tfvars <<'TFVARS'
db_password = "your-secure-database-password"
jwt_secret  = "your-long-random-jwt-secret-string"
TFVARS

# 2. Initialize Terraform (downloads the AWS provider)
terraform init

# 3. Preview what will be created (no changes made yet)
terraform plan

# 4. Create everything (type "yes" when prompted)
terraform apply

# 5. When you are done, tear everything down
terraform destroy
```

After `terraform apply` completes, it prints the load balancer URL. Open it in a browser to access the app.

Before the app works, you also need to build and push Docker images to the ECR repositories. The ECR URLs are printed in the outputs.

## Estimated Monthly Cost

Using the smallest instance sizes (the defaults in variables.tf):

| Service | Instance | Approximate Cost |
|---------|----------|-----------------|
| RDS PostgreSQL | db.t3.micro | ~$15/month |
| ElastiCache Redis | cache.t3.micro | ~$12/month |
| ECS Fargate (3 services) | 0.25 vCPU, 512 MB each | ~$10/month |
| NAT Gateway | per-hour + data | ~$32/month |
| ALB | per-hour + data | ~$16/month |
| **Total** | | **~$85/month** |

To reduce costs for development, you can remove the NAT gateway and place containers in public subnets instead. The NAT gateway alone accounts for roughly a third of the total.

## Porting to Azure

If your agency uses Azure instead of AWS, here is a mapping of equivalent services:

| AWS Service | Azure Equivalent | Notes |
|-------------|------------------|-------|
| ECS Fargate | Azure Container Apps | Similar container-as-a-service model |
| RDS PostgreSQL | Azure Database for PostgreSQL | Use the Flexible Server tier |
| ElastiCache Redis | Azure Cache for Redis | Basic tier for small workloads |
| ALB | Azure Application Gateway | Or Azure Front Door for global distribution |
| ECR | Azure Container Registry | Stores Docker images |
| VPC | Azure Virtual Network | Same concept, different terminology |
| NAT Gateway | Azure NAT Gateway | Same purpose, similar pricing |
| CloudWatch | Azure Monitor | Logs and metrics |
| IAM | Azure Active Directory + RBAC | Role-based access control |
