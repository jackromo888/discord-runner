# syntax=docker/dockerfile:1.3

#
# Builder stage.
# This state compile our TypeScript to get the JavaScript code
#

ARG PROJECT_NAME=discord-runner \
    NODE_VERSION=18.10.0 \
    ALPINE_VERSION=3.16 \
    ARCH=amd64 \
    BRANCH=main \
    COMMIT=aaaaaaa \
    DEVELOPER=GitHubUser \
    TIMESTAMP=2022-10-12T14:30:27+02:00 \
    USER=appuser \
    UID=10001 \
    PORT=8989

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS builder

ARG USER \
    UID

RUN apk update --no-cache \
   && apk add --no-cache ca-certificates tzdata \
   && update-ca-certificates \
   && adduser --disabled-password --gecos "" --home "/nonexistent" --shell "/sbin/nologin" --no-create-home --uid ${UID} ${USER}

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY ./src ./src

RUN npm ci --quiet \
  && npm run build

#
# Production stage.
# This state compile get back the JavaScript code from builder stage
# It will also install the production package only
#
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS app

ARG PROJECT_NAME \
    DEVELOPER \
    TIMESTAMP \
    COMMIT \
    BRANCH \
    NODE_VERSION \
    ALPINE_VERSION \
    USER \
    PORT

LABEL xyz.guild.image.authors="D3v <security@guild.xyz>" \
    project_name=${PROJECT_NAME} \
    developer=${DEVELOPER} \
    timestamp=${TIMESTAMP} \
    commit_sha=${COMMIT} \
    commit_branch=${BRANCH} \
    node_version=${NODE_VERSION} \
    alpine_version=${ALPINE_VERSION}
    
ENV NODE_ENV=production

WORKDIR /app

RUN chmod u+s /bin/ping \
  && rm -rf /lib/apk \
  && rm -rf /etc/apk \
  && rm -rf /usr/share/apk \
  && rm -rf /sbin/apk \
  && rm -rf /opt/yarn* \
  && find ./ -name "*.md" -type f -delete \
  && rm -rf /usr/local/lib/node_modules/npm \
  && rm -rf /usr/local/bin/LICENSE

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo 
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder --chown=${USER}:${USER} /app/node_modules ./node_modules
COPY --from=builder --chown=${USER}:${USER} /app/build ./build

EXPOSE ${PORT}

CMD ["node", "build/Main.js"]
