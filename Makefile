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

# Clear saved window state (useful during development)
clean-slate:
	@echo "Clearing WebView local storage (Linux/macOS)..."
	rm -rf ~/.local/share/$(APP_NAME) ~/.cache/$(APP_NAME) ~/.config/$(APP_NAME) ~/Library/Application\ Support/$(APP_NAME) ~/Library/Caches/$(APP_NAME)
