# Start from the official GoLang base image
FROM golang:latest
ENV CGO_ENABLED=1

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Install any necessary C libraries for SQLite (if needed)
RUN apt-get update && apt-get install -y gcc

# Copy the source code from the current directory to the Working Directory inside the container
COPY . .

# Build the Go app with SQLite support
RUN go build -o main .

# Metadata
LABEL author="Nasser"
LABEL version="1.0"
LABEL description="Short description of your Go application"

# Expose a port (if your Go application listens on a specific port)
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
