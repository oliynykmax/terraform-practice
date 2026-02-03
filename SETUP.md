# Setup Guide

## Initial Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd bun-k8s-demo
```

### 2. Configure AWS CLI
```bash
aws configure
# Enter:
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name: eu-north-1
# Default output format: json
```

### 3. Create IAM User for GitHub Actions

In AWS Console > IAM:
1. Create new user: `github-actions-deployer`
2. Attach these policies (or create custom policy):
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonEKS_CNI_Policy`
   - `AmazonEKSWorkerNodePolicy`
   - `AmazonEC2FullAccess` (for node groups)
   - `AmazonVPCFullAccess` (for VPC management)
   - `IAMFullAccess` (for creating roles)
3. Create access keys for this user
4. **Save the credentials** (you'll need them for GitHub secrets)

### 4. Set GitHub Secrets

Go to: `https://github.com/<your-username>/bun-k8s-demo/settings/secrets/actions`

Add these secrets:

| Name | Value | Description |
|------|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access key from step 3 | AWS access key for GitHub Actions |
| `AWS_SECRET_ACCESS_KEY` | Secret key from step 3 | AWS secret key for GitHub Actions |

### 5. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

Confirm with `yes` when prompted.

### 6. Configure kubectl

```bash
aws eks update-kubeconfig --name bun-k8s-demo --region eu-north-1
kubectl get nodes
```

### 7. Initial Deployment

```bash
# Option 1: Push to trigger GitHub Actions
git add .
git commit -m "Initial deployment"
git push origin main

# Option 2: Manual deploy (for testing)
docker build -t bun-k8s-demo:latest .
docker tag bun-k8s-demo:latest 176545285424.dkr.ecr.eu-north-1.amazonaws.com/bun-k8s-demo:latest
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 176545285424.dkr.ecr.eu-north-1.amazonaws.com
docker push 176545285424.dkr.ecr.eu-north-1.amazonaws.com/bun-k8s-demo:latest
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### 8. Get Load Balancer URL

```bash
kubectl get svc bun-k8s-demo
```

Copy the `EXTERNAL-IP` or `EXTERNAL-NAME` URL and visit it in your browser.

## Verify Deployment

### Check Kubernetes Resources
```bash
kubectl get all -l app=bun-k8s-demo
```

### View Logs
```bash
kubectl logs -l app=bun-k8s-demo --follow
```

### Test Health Endpoint
```bash
LB_URL=$(kubectl get svc bun-k8s-demo -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$LB_URL/health
```

## Making Updates

### Local Development
```bash
# 1. Run local server
bun server.js

# 2. Visit http://localhost:3000

# 3. Make changes to public/ files
```

### Deploy Changes
```bash
# 1. Commit and push
git add public/
git commit -m "Update website"
git push origin main

# 2. GitHub Actions automatically builds and deploys

# 3. Monitor deployment
kubectl rollout status deployment/bun-k8s-demo
```

## Troubleshooting

### GitHub Actions Fails
1. Check AWS credentials in GitHub secrets
2. Verify region in `.github/workflows/deploy.yml` matches your setup
3. Review error logs in Actions tab

### kubectl Not Connected
```bash
# Reconfigure
aws eks update-kubeconfig --name bun-k8s-demo --region eu-north-1 --force

# Verify
kubectl config current-context
```

### Pods Not Starting
```bash
kubectl describe pods -l app=bun-k8s-demo
kubectl logs -l app=bun-k8s-demo
```

### Need to Destroy Everything?
```bash
# Delete Kubernetes resources
kubectl delete -f k8s/

# Destroy AWS infrastructure
terraform destroy

# Confirm with 'yes'
```

## Quick Reference

### Terraform Commands
- `terraform init` - Initialize working directory
- `terraform plan` - Preview changes
- `terraform apply` - Apply changes
- `terraform destroy` - Destroy infrastructure

### kubectl Commands
- `kubectl get pods` - List pods
- `kubectl get svc` - List services
- `kubectl logs <pod>` - View pod logs
- `kubectl describe <resource>` - Get detailed info

### AWS CLI Commands
- `aws eks list-clusters` - List EKS clusters
- `aws ecr describe-repositories` - List ECR repos
- `aws sts get-caller-identity` - Check current user

## Important Files

- `server.js` - Bun HTTP server
- `Dockerfile` - Container definition
- `k8s/deployment.yaml` - Kubernetes deployment
- `k8s/service.yaml` - Kubernetes service
- `.github/workflows/deploy.yml` - CI/CD pipeline
- `main.tf`, `vpc.tf`, `eks.tf` - Terraform infrastructure

## Cost Monitoring

Check AWS Cost Explorer to monitor spending:
- EC2 instances: ~$10-30/month (depending on usage)
- EKS cluster: ~$73/month
- Load Balancer: ~$0.025/hour
- ECR: ~$0.10/GB/month

To minimize costs:
- Scale down to 0 nodes when not in use
- Use smaller instance types
- Delete unused resources

## Support

For issues:
1. Check README.md for detailed documentation
2. Review AWS CloudWatch logs
3. Check GitHub Actions logs
4. Verify IAM permissions

---

**Your site should now be live!** 🎉
