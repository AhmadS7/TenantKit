variable "aws_region" {
  type        = string
  description = "AWS region for deployments"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g. production, staging)"
  default     = "production"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "db_username" {
  type        = string
  description = "Administrator username for PostgreSQL RDS"
  default     = "cortex_admin"
}

variable "db_password" {
  type        = string
  description = "Administrator password for PostgreSQL RDS"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "JWT encryption key for backend authentication"
  sensitive   = true
}

variable "stripe_api_key" {
  type        = string
  description = "Stripe secret API Key"
  sensitive   = true
}

variable "stripe_webhook_secret" {
  type        = string
  description = "Stripe webhook event signing secret"
  sensitive   = true
}

variable "redis_node_type" {
  type        = string
  description = "Node type for ElastiCache Redis"
  default     = "cache.t4g.micro"
}
