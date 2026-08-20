# The interface is built on the host and copied in, rather than compiled inside
# the image.
#
# Building it here would need npm to reach the registry, and Docker's build
# sandbox cannot resolve DNS on some Linux hosts. The Go services solve that by
# vendoring their dependencies. Vendoring node_modules is impractical at this
# size, so the build moves to where the network already works.
#
# Run "make images", which builds dist on the host first. Building dist is
# still reproducible, it just happens one step earlier.
FROM nginx:1.27-alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
