.PHONY: all build run dev clean

APP_NAME=ddl8k

all: build

# Build a production-ready standalone binary
build:
	wails build

# Build and immediately run the standalone binary
run: build
	./build/bin/$(APP_NAME)

# Run the live-reloading Wails development server
dev:
	wails dev

# Clean out temporary build artifacts and binaries
clean:
	rm -rf build/bin/* build/obj/*
