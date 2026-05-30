terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # In production, uncomment the following block to use S3 for remote state
  # backend "s3" {
  #   bucket         = "tenantkit-tf-state-prod"
  #   key            = "state/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "tenantkit-tf-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "TenantKit"
      ManagedBy = "Terraform"
      Env       = var.environment
    }
  }
}
