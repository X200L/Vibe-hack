// sounds.js
export default function playSound(freq, duration = 0.1) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
    oscillator.type = "square";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    console.warn("Audio error:", e);
  }
}
