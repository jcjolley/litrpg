output "zone_id" {
  description = "Route 53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "certificate_arn" {
  description = "Validated ACM certificate ARN (use this for CloudFront)"
  value       = aws_acm_certificate_validation.main.certificate_arn
}
