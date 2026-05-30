resource "aws_db_subnet_group" "db" {
  name       = "tenantkit-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "tenantkit-${var.environment}-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "tenantkit-${var.environment}-rds-sg"
  description = "Security group for PostgreSQL RDS"
  vpc_id      = aws_vpc.main.id

  # Inbound rule: allow postgres connections only from ECS security group
  ingress {
    description     = "Allow database access from Fargate tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "tenantkit-${var.environment}-rds-sg"
  }
}

resource "aws_db_instance" "postgres" {
  identifier           = "tenantkit-${var.environment}-rds"
  allocated_storage    = 20
  max_allocated_storage = 100
  db_name              = "tenantkit"
  engine               = "postgres"
  engine_version       = "16.1" # Standard robust postgres version
  instance_class       = "db.t4g.micro"
  username             = var.db_username
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = true
  multi_az             = var.environment == "production"

  tags = {
    Name = "tenantkit-${var.environment}-postgres"
  }
}
