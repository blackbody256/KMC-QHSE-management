# Dependencies are vendored into the repository, so this build needs no
# network at all. That is deliberate: Docker's build network cannot reach a
# systemd-resolved stub on some Linux hosts, and a build that depends on
# nothing cannot fail that way. Refresh with: go mod vendor
FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
COPY vendor ./vendor

COPY platform ./platform
COPY services/admin ./services/admin

RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -trimpath -ldflags="-s -w" \
    -o /out/admin ./services/admin

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /out/admin /admin
USER nonroot:nonroot
EXPOSE 8084
ENTRYPOINT ["/admin"]
