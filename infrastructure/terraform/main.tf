# Outputs for the TenantKit infrastructure deployment

output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "Connection endpoint for PostgreSQL RDS"
  value       = aws_db_instance.postgres.endpoint
}

output "redis_endpoint" {
  description = "Connection endpoint for ElastiCache Redis"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}
