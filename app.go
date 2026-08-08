package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GetAudioInputs returns a list of audio inputs
func (a *App) GetAudioInputs() []Device {
	return GetAudioDevices(true)
}

// GetAudioOutputs returns a list of audio outputs
func (a *App) GetAudioOutputs() []Device {
	return GetAudioDevices(false)
}

// StartDelayEngine initializes audio and skode processing
func (a *App) StartDelayEngine(inputIdx, outputIdx int) string {
	err := StartAudioEngine()
	if err != nil {
		return err.Error()
	}
	SelectAudioDevices(outputIdx, inputIdx)
	
	// Select devices via Skode as well to be safe
	SendCommand(fmt.Sprintf("/ai %d", inputIdx))
	SendCommand(fmt.Sprintf("/ao %d", outputIdx))
	
	// Setup the live input voice and route it to delay bus 1
	// w7 is the first audio capture channel.
	// r1 routes voice 0 to track 1 (delay bus 1).
	// ds1 sends full signal to the delay.
	// l1 triggers the voice envelope.
	SendCommand("v0 w7 r1 ds1 l1")
	
	return "Started"
}

// StopDelayEngine stops processing
func (a *App) StopDelayEngine() {
	StopAudioEngine()
}

// SetDelayParams sets time (ms), feedback (0-1), and mix (0-1)
func (a *App) SetDelayParams(timeMs float64, feedback float64, mix float64) string {
	fbInt := int(feedback * 15.0)
	levelInt := int(mix * 15.0)
	
	// Set the delay time in ms
	SendCommand(fmt.Sprintf("DT 1 %d", int(timeMs)))
	// Configure feedback and level. '-' leaves coarse/fine at whatever DT set them to.
	// DL 1 coarse fine feedback modfreq moddepth level
	SendCommand(fmt.Sprintf("DL 1 - - %d 0 0 %d", fbInt, levelInt))
	
	return "Updated"
}

// ToggleFreeze turns the delay buffer freeze on or off
func (a *App) ToggleFreeze(frozen bool) {
	if frozen {
		SendCommand("DF 1 1")
	} else {
		SendCommand("DF 1 0")
	}
}

// SendSkodeCommand sends a raw skode command to the engine and returns the response
func (a *App) SendSkodeCommand(cmd string) string {
	return SendCommand(cmd)
}

// ChangeAudioDevice safely swaps devices at runtime
func (a *App) ChangeAudioDevice(inputIdx, outputIdx int) string {
	SelectAudioDevices(outputIdx, inputIdx)
	SendCommand(fmt.Sprintf("/ai %d", inputIdx))
	SendCommand(fmt.Sprintf("/ao %d", outputIdx))
	return "Changed"
}

// SetInputVolume sets the amplitude of voice 0 in decibels
func (a *App) SetInputVolume(db float64) string {
	return SendCommand(fmt.Sprintf("v0 a%.2f l1", db))
}

func (a *App) getConfigPath() string {
	cfgDir, err := os.UserConfigDir()
	if err != nil {
		cfgDir = os.TempDir()
	}
	dir := filepath.Join(cfgDir, "ddl8k")
	os.MkdirAll(dir, 0755)
	return filepath.Join(dir, "config.json")
}

func (a *App) SaveConfig(configJSON string) error {
	return os.WriteFile(a.getConfigPath(), []byte(configJSON), 0644)
}

func (a *App) LoadConfig() string {
	data, err := os.ReadFile(a.getConfigPath())
	if err != nil {
		return "{}"
	}
	return string(data)
}

func (a *App) OpenDirectoryDialog() string {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Directory",
	})
	if err != nil {
		return ""
	}
	return dir
}

func (a *App) OpenFileDialog() string {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Zip File",
		Filters: []runtime.FileFilter{
			{DisplayName: "Zip Archives", Pattern: "*.zip"},
		},
	})
	if err != nil {
		return ""
	}
	return file
}

func (a *App) GetSkredVersion() string {
	return GetSkredVersionStr()
}
