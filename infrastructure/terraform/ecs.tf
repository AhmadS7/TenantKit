resource "aws_security_group" "ecs" {
  name        = "tenantkit-${var.environment}-ecs-sg"
  description = "Security group for ECS Fargate tasks"
  vpc_id      = aws_vpc.main.id

  # Allow inbound traffic from ALB only
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "tenantkit-${var.environment}-ecs-sg"
  }
}

resource "aws_ecs_cluster" "main" {
  name = "tenantkit-${var.environment}-cluster"
}

# ECS IAM Task Execution Role
resource "aws_iam_role" "ecs_execution" {
  name = "tenantkit-${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (allows containers to speak to other AWS services like S3 or SES)
resource "aws_iam_role" "ecs_task" {
  name = "tenantkit-${var.environment}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "ecs-tasks.amazonaws.com" }
      }
    ]
  })
}

# CloudWatch Log Groups for container logs
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/tenantkit-${var.environment}-backend"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/tenantkit-${var.environment}-frontend"
  retention_in_days = 30
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "tenantkit-${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "tenantkit-backend:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "DB_HOST", value = aws_db_instance.postgres.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_USERNAME", value = var.db_username },
        { name = "DB_DATABASE", value = "tenantkit" },
        { name = "REDIS_HOST", value = aws_elasticache_cluster.redis.cache_nodes[0].address },
        { name = "REDIS_PORT", value = "6379" }
      ]
      secrets = [
        { name = "DB_PASSWORD", valueFrom = "${aws_secretsmanager_secret.tenantkit_secrets.arn}:db_password::" },
        { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.tenantkit_secrets.arn}:jwt_secret::" },
        { name = "STRIPE_API_KEY", valueFrom = "${aws_secretsmanager_secret.tenantkit_secrets.arn}:stripe_api_key::" },
        { name = "STRIPE_WEBHOOK_SECRET", valueFrom = "${aws_secretsmanager_secret.tenantkit_secrets.arn}:stripe_webhook_secret::" }
      ]
    }
  ])
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "tenantkit-${var.environment}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "tenantkit-frontend:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "NEXT_PUBLIC_API_URL", value = "https://tenantkit.app/v1" } # Point to custom domain via ALB
      ]
    }
  ])
}

# Backend Service
resource "aws_ecs_service" "backend" {
  name            = "tenantkit-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener_rule.api]
}

# Frontend Service
resource "aws_ecs_service" "frontend" {
  name            = "tenantkit-${var.environment}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
}

# AWS Secrets Manager Secret definitions
resource "aws_secretsmanager_secret" "tenantkit_secrets" {
  name                    = "tenantkit-${var.environment}-secrets"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "tenantkit_secrets_val" {
  secret_id     = aws_secretsmanager_secret.tenantkit_secrets.id
  secret_string = jsonencode({
    db_password           = var.db_password
    jwt_secret            = var.jwt_secret
    stripe_api_key        = var.stripe_api_key
    stripe_webhook_secret = var.stripe_webhook_secret
  })
}

resource "aws_iam_policy" "ecs_secrets" {
  name        = "tenantkit-${var.environment}-ecs-secrets-policy"
  description = "Allows ECS execution role to retrieve secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.tenantkit_secrets.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_secrets" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = aws_iam_policy.ecs_secrets.arn
}
