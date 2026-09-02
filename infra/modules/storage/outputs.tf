output "bucket_id" {
  value       = aws_s3_bucket.attachments.id
  description = "Name of the S3 attachments bucket"
}

output "bucket_arn" {
  value       = aws_s3_bucket.attachments.arn
  description = "ARN of the S3 attachments bucket"
}

output "bucket_regional_domain_name" {
  value       = aws_s3_bucket.attachments.bucket_regional_domain_name
  description = "Regional domain name of the attachments bucket"
}
