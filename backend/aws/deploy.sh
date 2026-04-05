#!/bin/bash
# LegalGuard AI — AWS Deployment Script
# Usage: ./deploy.sh [build|deploy|all]

set -euo pipefail

AWS_REGION="ap-southeast-1"
ECR_REPO="legalguard-ai-backend"
EKS_CLUSTER="legalguard-cluster"
NAMESPACE="legalguard"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"
IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

echo "=== LegalGuard AI AWS Deployment ==="
echo "Account: $ACCOUNT_ID"
echo "Region:  $AWS_REGION"
echo "Image:   $ECR_URI:$IMAGE_TAG"

build() {
    echo "--- Building Docker image ---"
    cd backend
    docker build -t $ECR_REPO:$IMAGE_TAG .
    docker tag $ECR_REPO:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
    docker tag $ECR_REPO:$IMAGE_TAG $ECR_URI:latest

    echo "--- Pushing to ECR ---"
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
    docker push $ECR_URI:$IMAGE_TAG
    docker push $ECR_URI:latest
    cd ..
    echo "--- Build complete ---"
}

deploy() {
    echo "--- Deploying to EKS ---"
    aws eks update-kubeconfig --name $EKS_CLUSTER --region $AWS_REGION

    # Create namespace if not exists
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

    # Apply K8s manifests
    kubectl apply -f backend/aws/k8s/secrets.yaml
    kubectl apply -f backend/aws/k8s/deployment.yaml
    kubectl apply -f backend/aws/k8s/service.yaml
    kubectl apply -f backend/aws/k8s/hpa.yaml
    kubectl apply -f backend/aws/k8s/geocoder-deployment.yaml

    # Update image
    kubectl set image deployment/legalguard-backend backend=$ECR_URI:$IMAGE_TAG -n $NAMESPACE

    echo "--- Waiting for rollout ---"
    kubectl rollout status deployment/legalguard-backend -n $NAMESPACE --timeout=300s

    echo "--- Waiting for geocoder ---"
    kubectl rollout status deployment/legalguard-geocoder -n $NAMESPACE --timeout=600s

    echo "--- Deploy complete ---"
    kubectl get pods -n $NAMESPACE
}

migrate() {
    echo "--- Running database migrations ---"
    # Get a pod name to exec into
    POD=$(kubectl get pods -n $NAMESPACE -l app=legalguard-backend -o jsonpath='{.items[0].metadata.name}')
    echo "Using pod: $POD"
    # Note: In production, use a migration job instead
    echo "Run manually: psql -h <aurora-host> -U legalguard -d legalguard -f backend/migrations/001_initial_schema.sql"
}

case "${1:-all}" in
    build)   build ;;
    deploy)  deploy ;;
    migrate) migrate ;;
    all)     build && deploy ;;
    *)       echo "Usage: $0 [build|deploy|migrate|all]" ;;
esac
