FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY platform ./platform
COPY services/identity ./services/identity

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/identity ./services/identity

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /out/identity /identity
USER nonroot:nonroot
EXPOSE 8082
ENTRYPOINT ["/identity"]
