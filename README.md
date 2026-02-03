# Bun K8s Demo - My Personal Website on AWS EKS

This repository hosts my personal website deployed on AWS EKS using Bun, Docker, Terraform, and Kubernetes with GitHub Actions for CI/CD.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐      ┌────────────────────────────────┐ │
│  │   Internet   │◄────►│    Application Load Balancer   │ │
│  └──────────────┘      └────────────────────────────────┘ │
│                                  │                         │
│  ┌────────────────────────────────▼─────────────────────┐ │
│  │                    EKS Cluster                       │ │
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │  Pod 1 (Bun + Static Files)             │ │ │
│  │  │  Pod 2 (Bun + Static Files)             │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                    VPC                               │ │
│  │  Private Subnets (10.0.1-3.x)                    │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Bun - Fast JavaScript runtime
- **Web Server**: Bun HTTP server serving static files
- **Container**: Docker
- **Infrastructure**: Terraform
- **Kubernetes**: AWS EKS
- **CI/CD**: GitHub Actions
- **Registry**: AWS ECR
- **Load Balancer**: AWS Classic Load Balancer

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Terraform installed (>= 1.0)
- Docker installed
- Bun installed
- kubectl installed
- GitHub account with repository access

## Initial Setup

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd bun-k8s-demo
```

### 2. Configure AWS CLI

```bash
aws configure
# Enter your AWS credentials and region (eu-north-1)
```

### 3. Deploy Infrastructure with Terraform

```bash
terraform init
terraform plan
terraform apply
```

This creates:
- VPC with public and private subnets
- EKS Kubernetes cluster (version 1.31)
- Managed node group (1 t3.small instance)
- ECR repository
- Security groups and networking

### 4. Configure kubectl

```bash
aws eks update-kubeconfig --name bun-k8s-demo --region eu-north-1
kubectl get nodes
```

### 5. Configure GitHub Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

- `AWS_ACCESS_KEY_ID` - AWS access key with ECR and EKS permissions
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key

### 6. Update GitHub Actions Region

If using a different AWS region, update `.github/workflows/deploy.yml`:

```yaml
env:
  AWS_REGION: your-region-here
  ECR_REPOSITORY: bun-k8s-demo
```

## Automated Deployment (CI/CD)

### Automatic Deployments

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

1. **Triggers on**:
   - Push to `main` branch
   - Changes to `public/`, `server.js`, `Dockerfile`, or workflow file
   - Manual trigger via GitHub Actions UI

2. **Builds and pushes**:
   - Docker image to AWS ECR
   - Tags with branch name, SHA, and `latest`

3. **Deploys to**:
   - Kubernetes EKS cluster
   - Updates deployment with new image
   - Rolls out changes gradually

### Manual Trigger

1. Go to GitHub Actions tab
2. Select "Build and Deploy" workflow
3. Click "Run workflow"

## Manual Deployment (Optional)

If you need to deploy manually:

```bash
# Build and push Docker image
docker build -t bun-k8s-demo:latest .
docker tag bun-k8s-demo:latest 176545285424.dkr.ecr.eu-north-1.amazonaws.com/bun-k8s-demo:latest
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 176545285424.dkr.ecr.eu-north-1.amazonaws.com
docker push 176545285424.dkr.ecr.eu-north-1.amazonaws.com/bun-k8s-demo:latest

# Update Kubernetes deployment
kubectl set image deployment/bun-k8s-demo bun-k8s-demo=176545285424.dkr.ecr.eu-north-1.amazonaws.com/bun-k8s-demo:latest

# Or use the deploy script
./deploy.sh 176545285424.dkr.ecr.eu-north-1.amazonaws.com/bun-k8s-demo:latest
```

## Development

### Local Development

```bash
# Run the Bun server locally
bun server.js

# Visit http://localhost:3000
```

### Testing Locally with Docker

```bash
# Build and run locally
docker build -t bun-k8s-demo:latest .
docker run -p 3000:3000 bun-k8s-demo:latest
```

### Making Changes

1. Edit files in `public/` directory (HTML, CSS, assets)
2. Test locally with `bun server.js`
3. Commit and push to main
4. GitHub Actions automatically deploys

### Server Configuration

The Bun server (`server.js`) handles:
- `/` → Serves `public/index.html`
- `/maoliiny.jpg` → Serves profile image
- `/Oliinyk_CV.pdf` → Serves CV
- `/health` → Health check endpoint
- All other paths → 404

## AWS IAM Permissions Required

The AWS user needs these permissions:
- `ecr:*` - Full ECR access
- `eks:*` - Full EKS access
- `ec2:*` - EC2 for node groups
- `iam:*` - IAM for roles
- `vpc:*` - VPC management

## Useful Commands

### Terraform
```bash
terraform fmt           # Format Terraform files
terraform validate       # Validate configuration
terraform plan          # Show changes
terraform apply         # Apply changes
terraform destroy       # Destroy infrastructure
```

### kubectl
```bash
kubectl get all                    # List all resources
kubectl get pods -l app=bun-k8s-demo    # Get application pods
kubectl logs -l app=bun-k8s-demo            # View logs
kubectl rollout status deployment/bun-k8s-demo   # Check rollout status
kubectl describe deployment bun-k8s-demo      # Deployment details
kubectl scale deployment bun-k8s-demo --replicas=3  # Scale up
```

### AWS CLI
```bash
aws eks list-clusters              # List clusters
aws ecr describe-repositories --repository-names bun-k8s-demo
aws ec2 describe-instances         # List EC2 nodes
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### GitHub Actions failing
1. Check AWS credentials are correct
2. Verify region matches your infrastructure
3. Check IAM permissions
4. Review workflow logs in Actions tab

### Load balancer not working
- Wait 2-5 minutes for full provisioning
- Check security groups allow traffic on port 80
- Verify target group health
```bash
kubectl get svc bun-k8s-demo
kubectl describe svc bun-k8s-demo
```

### Rollback deployment
```bash
# View rollout history
kubectl rollout history deployment/bun-k8s-demo

# Rollback to previous version
kubectl rollout undo deployment/bun-k8s-demo

# Rollback to specific revision
kubectl rollout undo deployment/bun-k8s-demo --to-revision=2
```

## Cost Optimization

- Use smaller instance types (t3.small)
- Set min_size to 0 in Terraform when not needed
- Delete resources when not in use
- Monitor spending with AWS Cost Explorer
- Consider using Fargate for workloads

## Monitoring and Logs

### View Logs
```bash
# Application logs
kubectl logs -l app=bun-k8s-demo --follow

# Previous pod logs
kubectl logs -l app=bun-k8s-demo --previous
```

### Check Health
```bash
# Pod health
kubectl get pods -l app=bun-k8s-demo

# Service endpoints
kubectl get endpoints bun-k8s-demo

# Test health endpoint
kubectl run --rm -i --tty test-pod --image=curlimages/curl -- sh
curl http://bun-k8s-demo/health
```

## Project Structure

```
.
├── public/                 # Static website files
│   ├── index.html
│   ├── maoliiny.jpg
│   └── Oliinyk_CV.pdf
├── k8s/                   # Kubernetes manifests
│   ├── deployment.yaml
│   └── service.yaml
├── .github/workflows/     # CI/CD
│   └── deploy.yml
├── server.js              # Bun HTTP server
├── Dockerfile             # Container definition
├── main.tf               # Terraform main config
├── vpc.tf                # VPC configuration
├── eks.tf                # EKS cluster
├── variables.tf           # Terraform variables
├── outputs.tf            # Terraform outputs
├── terraform.tfvars      # Terraform variable values
├── deploy.sh             # Manual deployment script
└── README.md             # This file
```

## Next Steps

- [ ] Add domain and SSL certificate
- [ ] Implement Ingress Controller (ALB Ingress)
- [ ] Add monitoring (CloudWatch, Prometheus)
- [ ] Set up auto-scaling policies
- [ ] Add secrets management (AWS Secrets Manager)
- [ ] Implement rolling updates with zero downtime
- [ ] Add automated testing in CI/CD
- [ ] Set up staging/production environments

## License

MIT

## Author

Max Oliinyk - [oliinyk.dev](https://oliinyk.dev)
