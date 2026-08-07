# Build context is the repository root, so that the platform library is in
# scope. One module, one build, per Section 1.5 of the production build plan.
FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY platform ./platform
COPY services/gateway ./services/gateway

# Static binary: the runtime image has no libc.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/gateway ./services/gateway

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /out/gateway /gateway
USER nonroot:nonroot
EXPOSE 8081
ENTRYPOINT ["/gateway"]
