# bun-k8s-demo

Personal website on AWS EKS.

## Deploy

```bash
terraform init && terraform apply
aws eks update-kubeconfig --name bun-k8s-demo --region eu-north-1
```

Push to `main` to deploy via GitHub Actions.

## GitHub Secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Commands

```bash
bun server.js              # local dev
kubectl get svc            # get load balancer URL
kubectl rollout status deployment/bun-k8s-demo
terraform destroy          # cleanup
```
