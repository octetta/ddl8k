package main

/*
#cgo CFLAGS: -I${SRCDIR}/clib/pulp/include
#cgo linux LDFLAGS: ${SRCDIR}/clib/pulp/lib/libapi.a -lasound -ldl -lpthread -lm
#cgo darwin LDFLAGS: ${SRCDIR}/clib/pulp/lib/libapi.a -framework CoreAudio -framework CoreFoundation -framework AudioUnit -framework AudioToolbox -framework CoreMIDI -lpthread -lm
#cgo windows LDFLAGS: ${SRCDIR}/clib/pulp/lib/libapi.a -lwinmm -lole32 -luser32 -lws2_32 -lm
#include <skred/api.h>
#include <stdlib.h>
*/
import "C"
import (
	"fmt"
	"os"
	"strconv"
	"unsafe"
)

type Device struct {
	Index int    `json:"index"`
	Name  string `json:"name"`
}

// RefreshAudioDevices prompts miniaudio/skred to rescan hardware
func RefreshAudioDevices() {
	C.skred_audio_refresh()
}

func GetAudioDevices(isCapture bool) []Device {
	cIsCapture := C.int(0)
	if isCapture {
		cIsCapture = C.int(1)
	}

	C.skred_audio_refresh()
	numDevices := int(C.skred_devices(cIsCapture))
	
	var devices []Device
	for i := 0; i < numDevices; i++ {
		idx := int(C.skred_device_idx(cIsCapture, C.int(i)))
		nameC := C.skred_device_str(cIsCapture, C.int(i))
		name := C.GoString(nameC)
		devices = append(devices, Device{Index: idx, Name: name})
	}
	
	// Add default devices
	devices = append([]Device{{Index: -1, Name: "Default"}}, devices...)
	if isCapture {
		devices = append([]Device{{Index: -2, Name: "Off"}}, devices...)
	}

	return devices
}

var engineRunning bool = false

func StartAudioEngine() error {
	if engineRunning {
		// Stop it first to cleanly restart if already running
		StopAudioEngine()
	}

	frames := 128
	voices := 4
	port := 0

	if f, err := strconv.Atoi(os.Getenv("SKRED_FRAMES")); err == nil {
		frames = f
	}
	if v, err := strconv.Atoi(os.Getenv("SKRED_VOICES")); err == nil {
		voices = v
	}
	if p, err := strconv.Atoi(os.Getenv("SKRED_PORT")); err == nil {
		port = p
	}

	if C.skred_start(C.uint(frames), C.uint(voices), C.int(port)) != 0 {
		return fmt.Errorf("skred_start failed")
	}
	engineRunning = true

	// Setup the digital delay line (skode)
	// Create a simple delay loop in skode
	// We'll configure a delay line on a voice or a track
	SendCommand("v0 l1 ds0") // Start voice 0, route to delay?
	return nil
}

func StopAudioEngine() {
	if !engineRunning {
		return
	}
	C.skred_stop()
	engineRunning = false
}

func SelectAudioDevices(playbackIdx, captureIdx int) {
	C.skred_audio_select(C.int(0), C.int(playbackIdx))
	C.skred_audio_select(C.int(1), C.int(captureIdx))
	C.skred_audio_reconnect()
}

func init() {
	// Enable logging so skred_log() actually returns output for the console!
	C.skred_logger(1)
}

func SendCommand(cmd string) string {
	// skred_command might modify the string, so we provide a safe 512-byte buffer
	buf := make([]byte, 512)
	copy(buf, cmd)
	cStr := (*C.char)(unsafe.Pointer(&buf[0]))
	
	C.skred_command(cStr)
	
	logC := C.skred_log()
	if logC != nil {
		return C.GoString(logC)
	}
	return ""
}

func GetSkredVersionStr() string {
	return C.GoString(C.skred_version())
}
