# Infrastructure reference

The actual $0/month deployment is configured manually in Render, Neon, Upstash, and Cloudflare R2 dashboards because these free-tier services are the selected deployment target and provider support may be incomplete or unnecessarily complex for this project.

This directory will contain provider-neutral Terraform examples for a future paid production migration. It must never contain credentials, committed `.tfvars` secrets, or state files. The deployment documentation will explicitly distinguish manual free-tier configuration from Terraform-managed infrastructure.
