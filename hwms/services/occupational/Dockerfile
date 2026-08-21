# Dependencies are vendored into the repository, so this build needs no
# network at all. That is deliberate: Docker's build network cannot reach a
# systemd-resolved stub on some Linux hosts, and a build that depends on
# nothing cannot fail that way. Refresh with: go mod vendor
FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
COPY vendor ./vendor

COPY platform ./platform
COPY services/occupational ./services/occupational

RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -trimpath -ldflags="-s -w" \
    -o /out/occupational ./services/occupational

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /out/occupational /occupational
USER nonroot:nonroot
EXPOSE 8085
ENTRYPOINT ["/occupational"]
