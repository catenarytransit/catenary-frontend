FROM debian:latest

# Install Bun

RUN apt-get update && apt-get install -y curl unzip
RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /frontend

# Copy the source code into the container

COPY . .

RUN bun install
RUN bun run build

CMD ["bun run preview"]