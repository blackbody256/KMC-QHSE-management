# Kubernetes deployment

Manifests for k3s on KMC infrastructure, written alongside the Compose stack so that production is a deployment change rather than a rewrite.

**Item P-01 is open.** Kubernetes is a proposal, not an approved requirement. If ICT prefers Compose on virtual machines, or Nomad, this directory is discarded and nothing else in the repository changes, the images and the configuration keys are the same either way.

## Apply order

```bash
kubectl apply -f 00-namespace-and-config.yaml
kubectl apply -f 10-data.yaml
kubectl apply -f 20-services.yaml
```

## Before the first apply

**Replace the secret.** `00-namespace-and-config.yaml` declares `hwms-secrets` with placeholder values so that the key names are documented in one place. Do not apply it as it stands. Create the secret from a KMC-controlled source instead:

```bash
kubectl -n hwms create secret generic hwms-secrets \
  --from-literal=POSTGRES_PASSWORD=... \
  --from-literal=CLINICAL_DB_PASSWORD=... \
  --from-literal=GATEWAY_CLIENT_SECRET=... \
  --from-literal=IDENTITY_CLIENT_SECRET=... \
  --from-literal=METRICS_INGEST_TOKEN=... \
  --from-literal=KEYCLOAK_ADMIN_PASSWORD=...
```

The client secrets must match what the Keycloak realm holds. The development values in `deploy/keycloak/realm-hwms.json` exist so a laptop works without configuration; they are in source control and are not secrets.

**Create the databases.** An empty Postgres volume runs the ConfigMap init
file and creates `keycloak`, `identity`, `admin`, `occupational` and
`metrics`. The init directory is ignored after the volume has data. On an
existing cluster, create any missing databases once against the running
Postgres before starting the application deployments.

**Set the hostname.** `qhse.kiiramotors.local` appears in the ConfigMap, the ingress and the gateway's redirect URL. Change all three together, and add the same callback address to the `hwms-gateway` client in Keycloak, or sign-in will be refused with an invalid redirect.

## Two things that are load-bearing

**The gateway runs one replica.** Its session store is in-memory by construction, so a second replica would not share sessions and users would appear to be signed out at random. The store is behind a three-method interface precisely so it can be swapped for Postgres or Redis; do that before raising `replicas`.

**Keycloak is served at `/idp`, not `/auth`.** The gateway owns `/auth/login`, `/auth/callback`, `/auth/session` and `/auth/logout` on the same host. Two owners of one prefix is a routing bug waiting to be written.

## Not yet here

- Loki and Tempo. Prometheus and Grafana run in Compose but are not in these manifests; join the existing KMC estate if there is one, per P-04.
- Backups. Nightly encrypted backups with a tested quarterly restore are required before real data, per OPS-05 to OPS-08.
- Pod disruption budgets and resource tuning, which need a real load profile rather than a guess.
