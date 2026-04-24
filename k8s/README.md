# Deploy MERN App to Kind

This folder contains Kubernetes manifests for:

- MongoDB
- Backend API
- Frontend (nginx + React build)
- Services for internal communication
- Optional Ingress for host-based access

## 1) Build images

From project root:

```powershell
docker build -t mernapp/backend:latest ./backend
docker build -t mernapp/frontend:latest ./frontend/todoapp
```

## 2) Load images into Kind

Replace `kind` with your cluster name if different.

```powershell
kind load docker-image mernapp/backend:latest --name kind
kind load docker-image mernapp/frontend:latest --name kind
```

## 3) Apply manifests

```powershell
kubectl apply -k ./k8s
```

## 4) Verify

```powershell
kubectl get pods -n mernapp
kubectl get svc -n mernapp
```

Frontend is exposed as NodePort `30080`.

If you use the default Kind node port mapping, open:

- http://localhost:30080

## Optional: Ingress

`04-ingress.yaml` expects an nginx ingress controller and routes:

- host: `mernapp.local`
- path: `/` -> `frontend` service

If ingress-nginx is installed, add an OS hosts entry:

- `127.0.0.1 mernapp.local`

Then access:

- http://mernapp.local

## Notes

- MongoDB data currently uses `emptyDir` (ephemeral). Data resets when the pod is recreated.
- Backend `MONGO_URI` is defined in `02-backend.yaml` as `mongodb://mongo:27017/mernapp`.
