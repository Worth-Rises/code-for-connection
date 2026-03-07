# alb.tf - Application Load Balancer
#
# The ALB is the single entry point for all internet traffic.
# It sits in the public subnets and forwards requests to the
# correct service based on the URL path:
#
#   /api/*        --> API service (REST endpoints)
#   /socket.io/*  --> Signaling service (WebRTC coordination)
#   /*            --> Web service (the frontend app, default)
#
# Think of it as a receptionist who directs visitors to the right floor.
#
# ABOUT HTTPS:
# This configuration only sets up HTTP (port 80) for initial testing.
# For production, you should:
#   1. Get a domain name
#   2. Create an SSL/TLS certificate using AWS Certificate Manager (free)
#   3. Add an HTTPS listener on port 443
#   4. Redirect port 80 to 443
# There are comments below marking where to add HTTPS.

# ---------------------------------------------------------------------------
# Application Load Balancer
# ---------------------------------------------------------------------------

resource "aws_lb" "main" {
  name               = "${var.app_name}-${var.environment}-alb"
  internal           = false         # false = internet-facing (public)
  load_balancer_type = "application" # ALB (Layer 7, understands HTTP)
  security_groups    = [aws_security_group.alb.id]

  # The ALB needs to be in public subnets so the internet can reach it
  subnets = [
    aws_subnet.public_1.id,
    aws_subnet.public_2.id,
  ]

  tags = {
    Name = "${var.app_name}-${var.environment}-alb"
  }
}

# ---------------------------------------------------------------------------
# Target Groups
# A target group is a pool of containers that can handle a type of request.
# The ALB health-checks each container and only sends traffic to healthy ones.
# ---------------------------------------------------------------------------

# --- API Target Group ---
resource "aws_lb_target_group" "api" {
  name        = "${var.app_name}-${var.environment}-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip" # Required for Fargate (containers get their own IPs)

  # Health check: the ALB pings this path every 30 seconds.
  # If it gets a 200 OK, the container is healthy.
  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2  # 2 successful checks = healthy
    unhealthy_threshold = 3  # 3 failed checks = unhealthy
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-api-tg"
  }
}

# --- Web Target Group ---
resource "aws_lb_target_group" "web" {
  name        = "${var.app_name}-${var.environment}-web-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-web-tg"
  }
}

# --- Signaling Target Group ---
resource "aws_lb_target_group" "signaling" {
  name        = "${var.app_name}-${var.environment}-sig-tg"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  # WebSocket connections need "sticky sessions" so the same client
  # always reaches the same container during a call.
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400 # 24 hours (in seconds)
    enabled         = true
  }

  health_check {
    enabled             = true
    path                = "/"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200,101" # 101 = WebSocket upgrade, also acceptable
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-signaling-tg"
  }
}

# ---------------------------------------------------------------------------
# HTTP Listener (port 80)
# The listener watches for incoming requests and applies rules to route them.
# The default action sends traffic to the web service (the frontend).
#
# TODO for production: Add an HTTPS listener on port 443 and redirect
# all port 80 traffic to HTTPS. Example:
#
#   resource "aws_lb_listener" "https" {
#     load_balancer_arn = aws_lb.main.arn
#     port              = 443
#     protocol          = "HTTPS"
#     ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
#     certificate_arn   = aws_acm_certificate.main.arn
#     default_action { ... }
#   }
# ---------------------------------------------------------------------------

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default: send everything to the web frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-http-listener"
  }
}

# ---------------------------------------------------------------------------
# Listener Rules
# Rules are evaluated in order of priority (lowest number = highest priority).
# When a request matches a rule's condition, it goes to that rule's target group.
# ---------------------------------------------------------------------------

# Route /api/* to the API service
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100 # Evaluated first

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-api-rule"
  }
}

# Route /socket.io/* to the signaling service
resource "aws_lb_listener_rule" "signaling" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 200 # Evaluated second

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.signaling.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/*"]
    }
  }

  tags = {
    Name = "${var.app_name}-${var.environment}-signaling-rule"
  }
}

# Everything else (/*) goes to the web service via the default action above.
# No explicit rule needed; the listener's default_action handles it.
