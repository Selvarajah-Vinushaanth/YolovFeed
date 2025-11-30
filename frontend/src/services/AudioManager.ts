import React, { useRef, useEffect, useState } from 'react';

interface AudioManagerProps {
  enabled: boolean;
}

class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private masterVolume: number = 0.7;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async initialize() {
    try {
      console.log('🔊 AudioManager: Initializing...');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required for user interaction policy)
      if (this.audioContext.state === 'suspended') {
        console.log('🔊 AudioManager: Resuming suspended audio context...');
        await this.audioContext.resume();
      }
      
      console.log('🔊 AudioManager: Audio context state:', this.audioContext.state);
      await this.loadSounds();
      console.log('🔊 AudioManager: Initialization complete!');
    } catch (error) {
      console.error('❌ AudioManager: Failed to initialize audio:', error);
    }
  }

  private async loadSounds() {
    if (!this.audioContext) return;

    const soundEffects = {
      // Object detection sounds
      person: this.generateTone(440, 0.2, 'sine'), // A4 note for person
      car: this.generateTone(220, 0.3, 'square'), // A3 note for vehicles
      dog: this.generateTone(330, 0.2, 'triangle'), // E4 note for animals
      cat: this.generateTone(330, 0.2, 'triangle'),
      bird: this.generateTone(880, 0.15, 'sine'), // A5 note for birds
      bicycle: this.generateTone(200, 0.25, 'sawtooth'),
      motorcycle: this.generateTone(150, 0.4, 'square'),
      bus: this.generateTone(110, 0.5, 'square'),
      truck: this.generateTone(100, 0.6, 'square'),
      
      // UI sounds
      click: this.generateTone(800, 0.1, 'sine'),
      success: this.generateChord([523, 659, 784], 0.3), // C major chord
      warning: this.generateTone(300, 0.4, 'square'),
      error: this.generateTone(200, 0.6, 'sawtooth'),
      
      // Special detection alerts
      multiple_objects: this.generateSequence([440, 550, 660], 0.15),
      high_confidence: this.generateChord([440, 554, 659], 0.25), // A major chord
    };

    for (const [name, audioBuffer] of Object.entries(soundEffects)) {
      this.soundBuffers.set(name, audioBuffer);
    }
  }

  private generateTone(frequency: number, duration: number, type: OscillatorType): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1;
          break;
        case 'sawtooth':
          sample = 2 * ((frequency * t) % 1) - 1;
          break;
      }
      
      // Apply envelope (fade in/out)
      const envelope = Math.min(t * 10, (duration - t) * 10, 1);
      data[i] = sample * envelope * 0.3; // Reduce volume
    }

    return buffer;
  }

  private generateChord(frequencies: number[], duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      frequencies.forEach(freq => {
        sample += Math.sin(2 * Math.PI * freq * t);
      });
      
      sample /= frequencies.length; // Normalize
      
      // Apply envelope
      const envelope = Math.min(t * 10, (duration - t) * 10, 1);
      data[i] = sample * envelope * 0.2;
    }

    return buffer;
  }

  private generateSequence(frequencies: number[], noteDuration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const totalDuration = frequencies.length * noteDuration;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, totalDuration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);

    frequencies.forEach((freq, index) => {
      const startSample = index * noteDuration * sampleRate;
      const endSample = startSample + noteDuration * sampleRate;
      
      for (let i = startSample; i < endSample && i < buffer.length; i++) {
        const t = (i - startSample) / sampleRate;
        const sample = Math.sin(2 * Math.PI * freq * t);
        const envelope = Math.min(t * 20, (noteDuration - t) * 20, 1);
        data[i] = sample * envelope * 0.3;
      }
    });

    return buffer;
  }

  async playSound(soundName: string, volume: number = 1) {
    console.log(`🔊 AudioManager: Attempting to play sound '${soundName}' at volume ${volume}`);
    
    if (!this.enabled) {
      console.log('❌ AudioManager: Sound disabled');
      return;
    }
    
    if (!this.audioContext) {
      console.log('❌ AudioManager: No audio context available');
      return;
    }
    
    if (!this.soundBuffers.has(soundName)) {
      console.log(`❌ AudioManager: Sound '${soundName}' not found in buffers. Available:`, Array.from(this.soundBuffers.keys()));
      return;
    }

    try {
      const audioBuffer = this.soundBuffers.get(soundName)!;
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      gainNode.gain.value = Math.min(volume, 1) * 0.5 * this.masterVolume; // Apply master volume
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  // Play object detection sound based on object type
  playObjectDetectionSound(objectType: string, confidence: number) {
    console.log(`🔊 AudioManager: playObjectDetectionSound called with '${objectType}', confidence: ${confidence}`);
    
    // Add null/undefined checks
    if (!objectType || typeof objectType !== 'string') {
      console.warn('❌ AudioManager: Invalid objectType provided to playObjectDetectionSound:', objectType);
      return;
    }

    if (typeof confidence !== 'number' || isNaN(confidence)) {
      confidence = 0.5; // Default confidence
    }

    const soundMap: { [key: string]: string } = {
      'person': 'person',
      'car': 'car', 
      'truck': 'truck',
      'bus': 'bus',
      'motorcycle': 'motorcycle',
      'bicycle': 'bicycle',
      'dog': 'dog',
      'cat': 'cat',
      'bird': 'bird',
      'chair': 'click',  // Add chair
      'bottle': 'click', // Add more objects with fallback sounds
      'laptop': 'click',
      'cell phone': 'click',
      'book': 'click'
    };

    const soundName = soundMap[objectType.toLowerCase()] || 'click';
    const volume = confidence > 0.8 ? 1 : confidence > 0.5 ? 0.7 : 0.5;
    
    console.log(`🔊 AudioManager: Playing sound '${soundName}' for object '${objectType}' at volume ${volume}`);
    this.playSound(soundName, volume);
  }

  // Play UI feedback sounds
  playUISound(action: 'click' | 'success' | 'warning' | 'error') {
    this.playSound(action);
  }

  // Play special detection alerts
  playDetectionAlert(type: 'multiple_objects' | 'high_confidence') {
    this.playSound(type);
  }
}

export const AudioManagerComponent: React.FC<AudioManagerProps> = ({ enabled }) => {
  useEffect(() => {
    const audioManager = AudioManager.getInstance();
    audioManager.setEnabled(enabled);
    
    if (enabled) {
      audioManager.initialize();
    }
  }, [enabled]);

  return null;
};

export default AudioManager;