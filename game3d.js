// Configuration de la scène
let scene, camera, renderer;
let car, ball, opponentCar;
let controls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    rotateLeft: false,
    rotateRight: false,
    boost: false
};

// Variables de score
let playerScore = 0; // Score du joueur (cages oranges à droite)
let opponentScore = 0; // Score de l'IA (cages bleues à gauche)
let goalsScored = 0; // Score total (pour compatibilité)
let lastGoalTime = 0;
const goalCooldown = 2000; // 2 secondes entre les buts pour éviter les doublons

// Chronomètre de match (5 minutes)
const matchDurationMs = 5 * 60 * 1000; // 5 minutes en millisecondes
let matchStartTime = null;
let isMatchOver = false;
let gameMode = 'match'; // 'match' ou 'freeplay'

// Mode clavier (true = AZERTY/ZQSD, false = QWERTY/WASD)
let keyboardMode = true; // AZERTY par défaut

// Mode langue (français / anglais)
let languageMode = 'fr'; // 'fr' ou 'en'

// Modèle de voiture sélectionné ('fennec' ou 'octane')
let selectedCarModel = 'fennec'; // Par défaut Fennec

// Variables pour la prévisualisation 3D de la voiture sur la landing
let carPreviewScene = null;
let carPreviewCamera = null;
let carPreviewRenderer = null;
let carPreviewCar = null;
let carPreviewAnimationId = null;

// Variables de physique
const carSpeed = 0.13; // Réduit de 0.3 à 0.18
const carRotationSpeed = 0.02; // Réduit de 0.05 à 0.03
const boostMultiplier = 1.8;
let carVelocity = new THREE.Vector3(0, 0, 0);
let carRotation = 0;
let boostAmount = 100;
const boostConsumption = 0.5;
const boostRegen = 0.2;
const minSpeedForRotation = 0.1; // Vitesse minimale pour pouvoir tourner efficacement
const accelerationRate = 0.08; // Taux d'accélération (plus petit = accélération plus progressive)

// Physique verticale de la voiture (saut / dash)
let carVerticalVelocity = 0;
// Gravité plus douce pour un saut avec plus de hangtime / inertie
const carGravity = -0.02;
// Saut un peu plus fort
const carJumpForce = 0.5;
let carIsOnGround = true;
let carGroundY = 0; // hauteur de référence quand la voiture est posée
let hasJumpedOnce = false;
let canDoubleJump = false;
let firstJumpTime = 0;
const doubleJumpWindow = 400; // fenêtre pour le double saut (en ms)

// Variables de physique pour la voiture IA
let opponentCarVelocity = new THREE.Vector3(0, 0, 0);
let opponentCarRotation = 0;
let opponentCarBoostAmount = 100;
let opponentCarVerticalVelocity = 0;
let opponentCarIsOnGround = true;
let opponentCarGroundY = 0;

// Animation de frontflip (rotation 360° vers l'avant)
let isFrontFlipping = false;
let frontFlipStartTime = 0;
const frontFlipDuration = 300; // durée totale du flip en ms

// État général du jeu (menu / en jeu)
let isInGame = false;

// --- Système de son pour la voiture ---
let audioContext;
let engineOscillator;
let engineGainNode;
let boostOscillator;
let boostGainNode;
let masterGainNode;
let lastEngineSpeed = 0;
let audioStarted = false;
let isMuted = false;
let savedVolume = 100; // Volume sauvegardé (0-100)
let savedVolumeBeforeMute = 100; // Volume sauvegardé avant le mute
let savedMusicVolumeBeforeMute = 40; // Volume musique sauvegardé avant le mute

// --- Système de musique de fond ---
let backgroundMusic = null;
let musicAudioContext = null;
let musicSource = null;
let musicGainNode = null;
let currentMusicIndex = -1;
let musicPlaylist = [
    {
        path: 'music/Sync, Triangle, Eytan Peled - Where We Are.mp3',
        title: 'Where We Are',
        artist: 'Sync, Triangle, Eytan Peled'
    },
    {
        path: 'music/Abstrakt, weloveyouspydee - See The Sun.mp3',
        title: 'See The Sun',
        artist: 'Abstrakt, weloveyouspydee'
    },
    {
        path: 'music/noaa! - HYPNOTIZED!.mp3',
        title: 'HYPNOTIZED!',
        artist: 'noaa!'
    },
    {
        path: 'music/Cartoon, VALLO, KAZHI, Blooom - Euphoria.mp3',
        title: 'Euphoria',
        artist: 'Cartoon, VALLO, KAZHI, Blooom'
    },
    {
        path: 'music/Cartoon, Fred V, Immy Odon - All Weve Ever Known.mp3',
        title: 'All We\'ve Ever Known',
        artist: 'Cartoon, Fred V, Immy Odon'
    },
    {
        path: 'music/Whales & Gaash - Ghost In The Wall.mp3',
        title: 'Ghost In The Wall',
        artist: 'Whales & Gaash'
    },
    {
        path: 'music/Bad Computer - Cant Heal You.mp3',
        title: 'Can\'t Heal You',
        artist: 'Bad Computer'
    },
    {
        path: 'music/kaya!, LULO - Hit The Ground.mp3',
        title: 'Hit The Ground',
        artist: 'kaya!, LULO'
    }
];
let musicVolume = 0.4; // Volume de la musique (40% par défaut)
let savedMusicVolume = 40; // Volume musique sauvegardé (0-100)

// Charger toutes les préférences depuis localStorage
function loadPreferences() {
    // Volume général
    const savedVolumePref = localStorage.getItem('gameVolume');
    if (savedVolumePref !== null) {
        savedVolume = parseInt(savedVolumePref);
    }
    
    // Mute
    const savedMutePref = localStorage.getItem('gameMuted');
    if (savedMutePref === 'true') {
        isMuted = true;
    }
    
    // Volume musique
    const savedMusicVolumePref = localStorage.getItem('musicVolume');
    if (savedMusicVolumePref !== null) {
        savedMusicVolume = parseInt(savedMusicVolumePref);
        musicVolume = savedMusicVolume / 100;
    }
    
    // Volumes sauvegardés avant le mute (pour restauration après dé-mute)
    const savedVolumeBeforeMutePref = localStorage.getItem('volumeBeforeMute');
    if (savedVolumeBeforeMutePref !== null) {
        savedVolumeBeforeMute = parseInt(savedVolumeBeforeMutePref);
    } else {
        // Si pas de valeur sauvegardée, utiliser la valeur actuelle du volume
        savedVolumeBeforeMute = savedVolume > 0 ? savedVolume : 50;
    }
    
    const savedMusicVolumeBeforeMutePref = localStorage.getItem('musicVolumeBeforeMute');
    if (savedMusicVolumeBeforeMutePref !== null) {
        savedMusicVolumeBeforeMute = parseInt(savedMusicVolumeBeforeMutePref);
    } else {
        // Si pas de valeur sauvegardée, utiliser la valeur actuelle du volume musique
        savedMusicVolumeBeforeMute = savedMusicVolume > 0 ? savedMusicVolume : 40;
    }
    
    // Mode clavier
    const savedKeyboardMode = localStorage.getItem('keyboardMode');
    if (savedKeyboardMode !== null) {
        keyboardMode = savedKeyboardMode === 'true';
    }
    
    // Mode langue
    const savedLanguageMode = localStorage.getItem('languageMode');
    if (savedLanguageMode !== null && (savedLanguageMode === 'fr' || savedLanguageMode === 'en')) {
        languageMode = savedLanguageMode;
    }
    
    // Modèle de voiture
    const savedCarModel = localStorage.getItem('carModel');
    if (savedCarModel !== null && (savedCarModel === 'fennec' || savedCarModel === 'octane')) {
        selectedCarModel = savedCarModel;
    }
}

// Sauvegarder toutes les préférences dans localStorage
function savePreferences() {
    localStorage.setItem('gameVolume', savedVolume.toString());
    localStorage.setItem('gameMuted', isMuted.toString());
    localStorage.setItem('musicVolume', savedMusicVolume.toString());
    localStorage.setItem('volumeBeforeMute', savedVolumeBeforeMute.toString());
    localStorage.setItem('musicVolumeBeforeMute', savedMusicVolumeBeforeMute.toString());
    localStorage.setItem('keyboardMode', keyboardMode.toString());
    localStorage.setItem('languageMode', languageMode);
    localStorage.setItem('carModel', selectedCarModel);
}

// Initialiser le contexte audio
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGainNode = audioContext.createGain();
        
        // Charger toutes les préférences sauvegardées
        loadPreferences();
        
        // Appliquer le volume initial (si on est en mode mute, le volume sera à 0)
        if (isMuted) {
            // Si on est en mode mute, mettre les volumes à 0 mais garder les valeurs sauvegardées
            updateVolume(0);
            updateMusicVolume(0);
        } else {
            // Sinon, appliquer les volumes sauvegardés
            updateVolume(savedVolume);
            updateMusicVolume(savedMusicVolume);
        }
        
        masterGainNode.connect(audioContext.destination);
        
        // Les navigateurs nécessitent une interaction utilisateur pour démarrer l'audio
        // On initialisera le moteur au premier clic/touche
        const startAudio = () => {
            if (audioStarted || !audioContext) return;
            
            // Reprendre le contexte audio si suspendu
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Initialiser le son du moteur
            if (!engineOscillator) {
                initEngineSound();
            }
            audioStarted = true;
            console.log('Système audio démarré');
        };
        
        // Démarrer l'audio au premier clic ou touche
        document.addEventListener('click', startAudio, { once: true });
        document.addEventListener('keydown', startAudio, { once: true });
        
        // Initialiser les contrôles audio
        setupAudioControls();
        
        // Initialiser le système de musique
        initBackgroundMusic();
        
        console.log('Système audio initialisé (en attente d\'interaction)');
    } catch (e) {
        console.warn('Audio non disponible:', e);
    }
}

// Initialiser le système de musique de fond
function initBackgroundMusic() {
    // Utiliser le même contexte audio ou créer un nouveau
    if (!audioContext) {
        try {
            musicAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Impossible de créer le contexte audio pour la musique:', e);
            return;
        }
    } else {
        musicAudioContext = audioContext;
    }
    
    // Créer un gain node pour la musique (séparé du son de la voiture)
    musicGainNode = musicAudioContext.createGain();
    // Utiliser le volume sauvegardé ou la valeur par défaut
    const initialMusicVolume = savedMusicVolume > 0 ? savedMusicVolume / 100 : musicVolume;
    musicGainNode.gain.value = initialMusicVolume;
    musicVolume = initialMusicVolume;
    musicGainNode.connect(musicAudioContext.destination);
}

// Passer à la musique suivante dans la playlist
function nextMusic() {
    if (!musicAudioContext || musicPlaylist.length === 0) return;
    
    // Passer à la musique suivante dans l'ordre
    currentMusicIndex = (currentMusicIndex + 1) % musicPlaylist.length;
    loadAndPlayMusic(currentMusicIndex);
}

// Charger et jouer une musique spécifique par index
function loadAndPlayMusic(index) {
    if (!musicAudioContext || musicPlaylist.length === 0) return;
    if (index < 0 || index >= musicPlaylist.length) return;
    
    currentMusicIndex = index;
    const music = musicPlaylist[currentMusicIndex];
    
    // Arrêter la musique précédente si elle existe
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic = null;
    }
    
    // Réinitialiser le MediaElementSource
    if (musicSource) {
        try {
            musicSource.disconnect();
        } catch (e) {}
        musicSource = null;
    }
    
    // Créer un nouvel élément audio
    backgroundMusic = new Audio(music.path);
    backgroundMusic.loop = false; // Ne pas boucler automatiquement
    
    // Gérer la fin de la musique pour passer à la suivante
    backgroundMusic.addEventListener('ended', () => {
        playRandomMusic();
    });
    
    // Gérer les erreurs de chargement
    backgroundMusic.addEventListener('error', (e) => {
        console.warn('Erreur lors du chargement de la musique:', music.path, e);
        // Essayer la musique suivante
        currentMusicIndex = (currentMusicIndex + 1) % musicPlaylist.length;
        setTimeout(() => playRandomMusic(), 1000);
    });
    
    // Connecter l'audio au gain node via un MediaElementSource
    backgroundMusic.addEventListener('loadeddata', () => {
        try {
            // Créer le MediaElementSource seulement si pas déjà créé
            if (!musicSource) {
                musicSource = musicAudioContext.createMediaElementSource(backgroundMusic);
                musicSource.connect(musicGainNode);
            }
            
            // Jouer la musique
            backgroundMusic.play().catch(e => {
                console.warn('Impossible de jouer la musique:', e);
            });
            
            // Afficher le titre
            updateMusicDisplay(music);
        } catch (e) {
            console.warn('Erreur lors de la connexion de la musique:', e);
            // Si erreur (MediaElementSource déjà créé), connecter directement
            if (backgroundMusic && musicGainNode) {
                backgroundMusic.play().catch(err => {
                    console.warn('Impossible de jouer la musique:', err);
                });
                updateMusicDisplay(music);
            }
        }
    });
    
    // Charger la musique
    backgroundMusic.load();
}

// Charger et jouer une musique aléatoire
function playRandomMusic() {
    if (!musicAudioContext || musicPlaylist.length === 0) return;
    
    // Choisir une musique aléatoire (différente de la précédente)
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * musicPlaylist.length);
    } while (newIndex === currentMusicIndex && musicPlaylist.length > 1);
    
    loadAndPlayMusic(newIndex);
}

// Mettre à jour l'affichage de la musique
function updateMusicDisplay(music) {
    const musicTitle = document.getElementById('hud-music-title');
    const musicArtist = document.getElementById('hud-music-artist');
    const musicContainer = document.querySelector('.hud-music');
    
    if (musicTitle) {
        musicTitle.textContent = music.title;
    }
    if (musicArtist) {
        musicArtist.textContent = music.artist;
    }
    
    // Afficher le container avec animation
    if (musicContainer) {
        musicContainer.classList.add('visible');
        
        // Masquer après 5 secondes, puis réafficher brièvement à chaque changement
        setTimeout(() => {
            if (musicContainer) {
                musicContainer.classList.remove('visible');
            }
        }, 5000);
    }
}

// Démarrer la musique de fond
function startBackgroundMusic() {
    if (!musicAudioContext) {
        initBackgroundMusic();
    }
    
    // Reprendre le contexte audio si suspendu
    if (musicAudioContext && musicAudioContext.state === 'suspended') {
        musicAudioContext.resume();
    }
    
    // Si la musique est déjà en cours de lecture, ne pas la redémarrer
    if (backgroundMusic && !backgroundMusic.paused) {
        return;
    }
    
    // Jouer une musique aléatoire
    playRandomMusic();
}

// Arrêter la musique de fond
function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic = null;
    }
}

// Mettre à jour le volume de la musique
function updateMusicVolume(volume) {
    savedMusicVolume = volume;
    musicVolume = volume / 100;
    
    if (musicGainNode) {
        musicGainNode.gain.value = musicVolume;
    }
    
    // Sauvegarder toutes les préférences
    savePreferences();
}

// Configurer les contrôles audio (slider et bouton mute)
function setupAudioControls() {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const musicVolumeSlider = document.getElementById('musicVolumeSlider');
    const musicVolumeValue = document.getElementById('musicVolumeValue');
    const muteBtn = document.getElementById('muteBtn');
    
    if (!volumeSlider || !volumeValue || !muteBtn) return;
    
    // Initialiser le slider avec la valeur appropriée (0 si mute, sinon valeur sauvegardée)
    if (isMuted) {
        volumeSlider.value = 0;
        volumeValue.textContent = '0%';
    } else {
        volumeSlider.value = savedVolume;
        volumeValue.textContent = savedVolume + '%';
    }
    updateMuteButton();
    
    // Initialiser le slider musique
    if (musicVolumeSlider && musicVolumeValue) {
        if (isMuted) {
            musicVolumeSlider.value = 0;
            musicVolumeValue.textContent = '0%';
        } else {
            musicVolumeSlider.value = savedMusicVolume;
            musicVolumeValue.textContent = savedMusicVolume + '%';
        }
        
        // Gérer le changement de volume musique
        musicVolumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            updateMusicVolume(volume);
            musicVolumeValue.textContent = volume + '%';
        });
    }
    
    // Gérer le changement de volume
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        updateVolume(volume);
        volumeValue.textContent = volume + '%';
        
        // Si on augmente le volume, désactiver le mute
        if (isMuted && volume > 0) {
            isMuted = false;
            updateMuteButton();
            savePreferences();
        }
    });
    
    // Gérer le bouton mute
    muteBtn.addEventListener('click', () => {
        toggleMute();
    });
}

// Mettre à jour le volume
function updateVolume(volume) {
    savedVolume = volume;
    
    if (masterGainNode) {
        const normalizedVolume = volume / 100;
        const baseVolume = 0.3; // Volume de base (30%)
        masterGainNode.gain.value = baseVolume * normalizedVolume;
    }
    
    // Sauvegarder toutes les préférences
    savePreferences();
}

// Basculer le mute
function toggleMute() {
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const musicVolumeSlider = document.getElementById('musicVolumeSlider');
    const musicVolumeValue = document.getElementById('musicVolumeValue');
    
    isMuted = !isMuted;
    
    if (isMuted) {
        // Sauvegarder le volume actuel du slider avant de muter
        if (volumeSlider) {
            const currentVolume = parseInt(volumeSlider.value);
            // Sauvegarder la valeur actuelle (même si elle est à 0, on la garde)
            savedVolumeBeforeMute = currentVolume > 0 ? currentVolume : savedVolume;
            // Si la valeur sauvegardée est toujours 0, utiliser une valeur par défaut
            if (savedVolumeBeforeMute === 0) {
                savedVolumeBeforeMute = 50; // Valeur par défaut
            }
        } else {
            // Si le slider n'existe pas, utiliser la valeur actuelle sauvegardée
            savedVolumeBeforeMute = savedVolume > 0 ? savedVolume : 50;
        }
        
        // Sauvegarder le volume de la musique avant de muter
        if (musicVolumeSlider) {
            const currentMusicVolume = parseInt(musicVolumeSlider.value);
            savedMusicVolumeBeforeMute = currentMusicVolume > 0 ? currentMusicVolume : savedMusicVolume;
            // Si le volume musique est déjà à 0, utiliser une valeur par défaut
            if (savedMusicVolumeBeforeMute === 0) {
                savedMusicVolumeBeforeMute = 40; // Valeur par défaut
            }
        } else {
            // Si le slider n'existe pas, utiliser la valeur actuelle sauvegardée
            savedMusicVolumeBeforeMute = savedMusicVolume > 0 ? savedMusicVolume : 40;
        }
        
        // Muter le volume général
        updateVolume(0);
        // Muter la musique
        updateMusicVolume(0);
        
        // Mettre à jour les sliders visuellement
        if (volumeSlider) {
            volumeSlider.value = 0;
        }
        if (volumeValue) {
            volumeValue.textContent = '0%';
        }
        if (musicVolumeSlider) {
            musicVolumeSlider.value = 0;
        }
        if (musicVolumeValue) {
            musicVolumeValue.textContent = '0%';
        }
    } else {
        // Restaurer le volume sauvegardé avant le mute
        const volumeToRestore = savedVolumeBeforeMute > 0 ? savedVolumeBeforeMute : 50;
        updateVolume(volumeToRestore);
        // Restaurer le volume de la musique sauvegardé
        const musicVolumeToRestore = savedMusicVolumeBeforeMute > 0 ? savedMusicVolumeBeforeMute : 40;
        updateMusicVolume(musicVolumeToRestore);
        
        // Mettre à jour les sliders
        if (volumeSlider) {
            volumeSlider.value = volumeToRestore;
        }
        if (volumeValue) {
            volumeValue.textContent = volumeToRestore + '%';
        }
        if (musicVolumeSlider) {
            musicVolumeSlider.value = musicVolumeToRestore;
        }
        if (musicVolumeValue) {
            musicVolumeValue.textContent = musicVolumeToRestore + '%';
        }
    }
    
    updateMuteButton();
    savePreferences();
}

// Mettre à jour l'apparence du bouton mute
function updateMuteButton() {
    const muteBtn = document.getElementById('muteBtn');
    if (!muteBtn) return;
    
    if (isMuted) {
        muteBtn.textContent = '🔇';
        muteBtn.classList.add('muted');
    } else {
        muteBtn.textContent = '🔊';
        muteBtn.classList.remove('muted');
    }
}

// Initialiser le son du moteur (continu)
function initEngineSound() {
    if (!audioContext || engineOscillator) return;
    
    // Oscillateur principal pour le moteur (son grave)
    engineOscillator = audioContext.createOscillator();
    engineOscillator.type = 'sawtooth';
    engineOscillator.frequency.value = 80; // Fréquence de base
    
    // Ajouter un peu de bruit pour un son plus réaliste
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    const noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 200;
    noiseFilter.Q.value = 1;
    
    const noiseGain = audioContext.createGain();
    noiseGain.gain.value = 0.1;
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGainNode);
    noiseSource.start();
    
    // Gain pour le moteur
    engineGainNode = audioContext.createGain();
    engineGainNode.gain.value = 0.2; // Volume initial plus bas (ralenti)
    
    // Filtre passe-bas pour adoucir le son
    const engineFilter = audioContext.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400;
    engineFilter.Q.value = 1;
    
    engineOscillator.connect(engineFilter);
    engineFilter.connect(engineGainNode);
    engineGainNode.connect(masterGainNode);
    
    engineOscillator.start();
}

// Mettre à jour le son du moteur selon la vitesse
function updateEngineSound() {
    if (!audioContext || !engineOscillator || !engineGainNode || !isInGame) return;
    
    const currentSpeed = carVelocity.length();
    const targetSpeed = Math.min(currentSpeed * 2, carSpeed * 3); // Vitesse normalisée
    
    // Fréquence du moteur varie de 80Hz (ralenti) à 200Hz (pleine vitesse)
    const minFreq = 80;
    const maxFreq = 200;
    const targetFreq = minFreq + (maxFreq - minFreq) * (targetSpeed / (carSpeed * 3));
    
    // Lisser les changements de fréquence
    const smoothing = 0.1;
    const currentFreq = engineOscillator.frequency.value;
    engineOscillator.frequency.value = currentFreq + (targetFreq - currentFreq) * smoothing;
    
    // Volume varie aussi avec la vitesse
    const minVolume = 0.2;
    const maxVolume = 0.6;
    const targetVolume = minVolume + (maxVolume - minVolume) * (targetSpeed / (carSpeed * 3));
    
    const currentVolume = engineGainNode.gain.value;
    engineGainNode.gain.value = currentVolume + (targetVolume - currentVolume) * smoothing;
    
    lastEngineSpeed = currentSpeed;
}

// Son de boost
function playBoostSound() {
    if (!audioContext) return;
    
    // Arrêter le son de boost précédent s'il existe
    if (boostOscillator) {
        try {
            boostOscillator.stop();
        } catch (e) {}
    }
    
    // Créer un son de boost (son aigu et puissant)
    boostOscillator = audioContext.createOscillator();
    boostOscillator.type = 'sawtooth';
    boostOscillator.frequency.value = 300;
    
    boostGainNode = audioContext.createGain();
    boostGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    
    // Filtre pour le boost
    const boostFilter = audioContext.createBiquadFilter();
    boostFilter.type = 'bandpass';
    boostFilter.frequency.value = 400;
    boostFilter.Q.value = 2;
    
    boostOscillator.connect(boostFilter);
    boostFilter.connect(boostGainNode);
    boostGainNode.connect(masterGainNode);
    
    boostOscillator.start();
}

// Arrêter le son de boost
function stopBoostSound() {
    if (boostOscillator && boostGainNode) {
        boostGainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        setTimeout(() => {
            try {
                boostOscillator.stop();
                boostOscillator = null;
            } catch (e) {}
        }, 100);
    }
}

// Son de saut
function playJumpSound() {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
}

// Son de collision voiture-balle
function playCollisionSound(impactStrength) {
    if (!audioContext) return;
    
    // Son de "clac" pour la collision
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200 + impactStrength * 100, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    const gainNode = audioContext.createGain();
    const volume = Math.min(0.4, 0.1 + impactStrength * 0.3);
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Son de but
function playGoalSound() {
    if (!audioContext) return;
    
    // Son de célébration (arpège montant)
    const frequencies = [200, 250, 300, 350, 400];
    frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + index * 0.05);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + index * 0.05 + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.05 + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGainNode);
        
        oscillator.start(audioContext.currentTime + index * 0.05);
        oscillator.stop(audioContext.currentTime + index * 0.05 + 0.3);
    });
}

// --- Helpers textures terrain/murs style Rocket League ---

// Gazon stylisé (bandes de ton légèrement différent)
function createGrassTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Couleurs de base
    const baseGreen = '#1f6b3a';
    const lightGreen = '#2f8f4a';

    // Fond
    ctx.fillStyle = baseGreen;
    ctx.fillRect(0, 0, size, size);

    // Bandes horizontales comme sur un terrain de foot
    const stripeHeight = size / 8;
    for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) continue;
        ctx.fillStyle = lightGreen;
        ctx.fillRect(0, i * stripeHeight, size, stripeHeight);
    }

    // Légers points pour simuler la texture de pelouse
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-0.3);
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    const sigCodes = [69, 114, 108, 111, 119];
    const sigText = String.fromCharCode.apply(null, sigCodes).toUpperCase();
    ctx.fillText(sigText, 0, 0);
    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Murs néon futuristes (bandes diagonales)
function createWallTexture(primaryColor, secondaryColor) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fond sombre
    ctx.fillStyle = '#050710';
    ctx.fillRect(0, 0, size, size);

    // Bandes diagonales
    const stripeWidth = 40;
    ctx.lineWidth = stripeWidth;
    ctx.strokeStyle = primaryColor;

    for (let x = -size; x < size * 2; x += stripeWidth * 2.2) {
        ctx.beginPath();
        ctx.moveTo(x, -20);
        ctx.lineTo(x + size, size + 20);
        ctx.stroke();
    }

    // Contre-bandes plus fines en secondaryColor
    ctx.lineWidth = stripeWidth * 0.3;
    ctx.strokeStyle = secondaryColor;
    for (let x = -size; x < size * 2; x += stripeWidth * 2.2) {
        ctx.beginPath();
        ctx.moveTo(x + stripeWidth, -40);
        ctx.lineTo(x + size + stripeWidth, size + 40);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Initialisation
function init() {
    // Charger toutes les préférences AVANT l'initialisation
    loadPreferences();
    
    // Créer la scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 0, 200);

    // Créer la caméra
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 0, 0);

    // Créer le renderer
    const container = document.getElementById('gameContainer');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Éclairage
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Créer le terrain
    createField();

    // Créer la voiture
    createCar();

    // Créer la voiture IA (opponent)
    createOpponentCar();

    // Créer la balle
    createBall();

    // Gérer le redimensionnement
    window.addEventListener('resize', onWindowResize);

    // Contrôles clavier
    setupControls();
    
    // Initialiser l'affichage des contrôles
    updateControlsDisplay();

    // Initialiser les textes selon la langue
    updateLanguageTexts();

    // Configurer la landing page / caméra de menu
    setupLanding();

    // Initialiser le système audio
    initAudio();

    // Démarrer l'animation
    animate();
}

// Créer le terrain
function createField() {
    // Sol principal
    const fieldGeometry = new THREE.PlaneGeometry(100, 80);

    // Texture de gazon stylisée
    const grassTexture = createGrassTexture();
    grassTexture.repeat.set(8, 6);

    const fieldMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        color: 0xffffff,
        roughness: 0.75,
        metalness: 0.05
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    scene.add(field);

    // Lignes du terrain
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    
    // Ligne centrale
    const centerLineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.1, -40),
        new THREE.Vector3(0, 0.1, 40)
    ]);
    const centerLine = new THREE.Line(centerLineGeometry, lineMaterial);
    scene.add(centerLine);

    // Cercle central
    const circlePoints = [];
    for (let i = 0; i <= 64; i++) {
        const angle = (i / 64) * Math.PI * 2;
        circlePoints.push(new THREE.Vector3(
            Math.cos(angle) * 15,
            0.1,
            Math.sin(angle) * 15
        ));
    }
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circle = new THREE.Line(circleGeometry, lineMaterial);
    scene.add(circle);

    // Point central
    const centerPointGeometry = new THREE.CircleGeometry(0.5, 16);
    const centerPointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerPoint = new THREE.Mesh(centerPointGeometry, centerPointMaterial);
    centerPoint.rotation.x = -Math.PI / 2;
    centerPoint.position.y = 0.1;
    scene.add(centerPoint);

    // Murs autour du terrain
    const wallHeight = 5;
    // Textures murs bleus / oranges style Rocket League
    const blueWallTexture = createWallTexture('#1e90ff', '#00e5ff');
    const orangeWallTexture = createWallTexture('#ff8c00', '#ffd000');
    blueWallTexture.repeat.set(4, 1);
    orangeWallTexture.repeat.set(4, 1);

    const neutralWallMaterial = new THREE.MeshStandardMaterial({
        color: 0x111218,
        roughness: 0.5,
        metalness: 0.3
    });
    const blueWallMaterial = new THREE.MeshStandardMaterial({
        map: blueWallTexture,
        emissive: new THREE.Color(0x2060ff),
        emissiveIntensity: 0.4,
        roughness: 0.4,
        metalness: 0.6
    });
    const orangeWallMaterial = new THREE.MeshStandardMaterial({
        map: orangeWallTexture,
        emissive: new THREE.Color(0xff9600),
        emissiveIntensity: 0.4,
        roughness: 0.4,
        metalness: 0.6
    });

    // Mur nord
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(100, wallHeight, 1),
        neutralWallMaterial
    );
    northWall.position.set(0, wallHeight / 2, 40);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    scene.add(northWall);

    // Mur sud
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(100, wallHeight, 1),
        neutralWallMaterial
    );
    southWall.position.set(0, wallHeight / 2, -40);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    scene.add(southWall);

    // Mur est (avec ouverture pour le but)
    const goalWidth = 15; // Largeur du but
    const wallGap = goalWidth; // Espace pour le but + marge très réduite pour allonger les murs
    const wallLength = (80 - wallGap) / 2; // Longueur de chaque partie de mur
    
    // Mur est - partie supérieure (va jusqu'au bord z = 40)
    const eastWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, wallLength),
        orangeWallMaterial
    );
    eastWallTop.position.set(50, wallHeight / 2, 40 - wallLength / 2);
    eastWallTop.castShadow = true;
    eastWallTop.receiveShadow = true;
    scene.add(eastWallTop);
    
    // Mur est - partie inférieure (va jusqu'au bord z = -40)
    const eastWallBottom = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, wallLength),
        orangeWallMaterial
    );
    eastWallBottom.position.set(50, wallHeight / 2, -40 + wallLength / 2);
    eastWallBottom.castShadow = true;
    eastWallBottom.receiveShadow = true;
    scene.add(eastWallBottom);
    
    // Pas de mur au-dessus du but est - laissé ouvert

    // Mur ouest (avec ouverture pour le but)
    // Mur ouest - partie supérieure (va jusqu'au bord z = 40)
    const westWallTop = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, wallLength),
        blueWallMaterial
    );
    westWallTop.position.set(-50, wallHeight / 2, 40 - wallLength / 2);
    westWallTop.castShadow = true;
    westWallTop.receiveShadow = true;
    scene.add(westWallTop);
    
    // Mur ouest - partie inférieure (va jusqu'au bord z = -40)
    const westWallBottom = new THREE.Mesh(
        new THREE.BoxGeometry(1, wallHeight, wallLength),
        blueWallMaterial
    );
    westWallBottom.position.set(-50, wallHeight / 2, -40 + wallLength / 2);
    westWallBottom.castShadow = true;
    westWallBottom.receiveShadow = true;
    scene.add(westWallBottom);
    
    // Pas de mur au-dessus du but ouest - laissé ouvert
    
    // Créer les cages de but
    createGoals();
}

// Créer les cages de but
function createGoals() {
    const goalWidth = 15; // Largeur du but
    const goalHeight = 7; // Hauteur du but
    const goalDepth = 4; // Profondeur du but (augmentée)
    const postThickness = 0.2; // Épaisseur des poteaux
    
    // Matériau des buts
    const goalMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.7
    });
    
    // Créer un but (gauche - ouest)
    createGoal(-50, goalWidth, goalHeight, goalDepth, postThickness, goalMaterial);
    
    // Créer un but (droite - est)
    createGoal(50, goalWidth, goalHeight, goalDepth, postThickness, goalMaterial);
}

// Créer un but à une position donnée
function createGoal(xPosition, width, height, depth, thickness, material) {
    const goalGroup = new THREE.Group();
    
    // Poteau gauche
    const leftPost = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height, thickness),
        material
    );
    leftPost.position.set(0, height / 2, -width / 2);
    leftPost.castShadow = true;
    leftPost.receiveShadow = true;
    goalGroup.add(leftPost);
    
    // Poteau droit
    const rightPost = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height, thickness),
        material
    );
    rightPost.position.set(0, height / 2, width / 2);
    rightPost.castShadow = true;
    rightPost.receiveShadow = true;
    goalGroup.add(rightPost);
    
    // Barre transversale (haut)
    const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, thickness, width),
        material
    );
    topBar.position.set(0, height, 0);
    topBar.castShadow = true;
    topBar.receiveShadow = true;
    goalGroup.add(topBar);
    
    // Poteau arrière gauche
    const backLeftPost = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height, thickness),
        material
    );
    backLeftPost.position.set(-depth, height / 2, -width / 2);
    backLeftPost.castShadow = true;
    backLeftPost.receiveShadow = true;
    goalGroup.add(backLeftPost);
    
    // Poteau arrière droit
    const backRightPost = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, height, thickness),
        material
    );
    backRightPost.position.set(-depth, height / 2, width / 2);
    backRightPost.castShadow = true;
    backRightPost.receiveShadow = true;
    goalGroup.add(backRightPost);
    
    // Barre transversale arrière (haut)
    const backTopBar = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, thickness, width),
        material
    );
    backTopBar.position.set(-depth, height, 0);
    backTopBar.castShadow = true;
    backTopBar.receiveShadow = true;
    goalGroup.add(backTopBar);
    
    // Barre horizontale supérieure (reliant les deux barres transversales)
    const topConnector = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, thickness, depth),
        material
    );
    topConnector.position.set(-depth / 2, height, -width / 2);
    topConnector.rotation.y = Math.PI / 2;
    topConnector.castShadow = true;
    topConnector.receiveShadow = true;
    goalGroup.add(topConnector);
    
    const topConnector2 = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, thickness, depth),
        material
    );
    topConnector2.position.set(-depth / 2, height, width / 2);
    topConnector2.rotation.y = Math.PI / 2;
    topConnector2.castShadow = true;
    topConnector2.receiveShadow = true;
    goalGroup.add(topConnector2);
    
    // Filet (optionnel - représentation simplifiée)
    const netMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    
    // Filet arrière
    const backNet = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        netMaterial
    );
    backNet.position.set(-depth, height / 2, 0);
    backNet.rotation.y = Math.PI / 2;
    goalGroup.add(backNet);
    
    // Filet gauche
    const leftNet = new THREE.Mesh(
        new THREE.PlaneGeometry(depth, height),
        netMaterial
    );
    leftNet.position.set(-depth / 2, height / 2, -width / 2);
    leftNet.rotation.y = Math.PI;
    goalGroup.add(leftNet);
    
    // Filet droit
    const rightNet = new THREE.Mesh(
        new THREE.PlaneGeometry(depth, height),
        netMaterial
    );
    rightNet.position.set(-depth / 2, height / 2, width / 2);
    rightNet.rotation.y = 0;
    goalGroup.add(rightNet);
    
    // Filet supérieur
    const topNet = new THREE.Mesh(
        new THREE.PlaneGeometry(depth, width), // Échanger width et depth
        netMaterial
    );
    topNet.position.set(-depth / 2, height, 0);
    topNet.rotation.x = Math.PI / 2;
    goalGroup.add(topNet);
    
    // Sol du but
    // Reprendre le même type de matériau que le terrain principal
    const goalFloorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.75,
        metalness: 0.05
    });
    const goalFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(depth, width), // Échanger width et depth
        goalFloorMaterial
    );
    goalFloor.rotation.x = -Math.PI / 2;
    goalFloor.position.set(-depth / 2, 0.01, 0); // Légèrement au-dessus du sol pour éviter les z-fighting
    goalFloor.receiveShadow = true;
    goalGroup.add(goalFloor);
    
    // Positionner le but
    goalGroup.position.set(xPosition, 0, 0);
    
    // Si c'est le but de droite, le tourner de 180° pour qu'il regarde vers l'intérieur
    if (xPosition > 0) {
        goalGroup.rotation.y = Math.PI;
    }
    
    scene.add(goalGroup);
}

// Créer la voiture (charger le modèle GLTF Fennec)
function createCar() {
    car = new THREE.Group();
    
    // Position initiale - en face de la balle et des cages
    // Positionner la voiture au centre du terrain, tournée de 90° par rapport à la balle
    car.position.set(-20, 0, 0);
    carGroundY = 0;
    carRotation = Math.PI / 2; // Rotation de 90° (regarde vers le haut, direction positive Z)
    car.rotation.y = carRotation;
    car.castShadow = true;
    scene.add(car);
    
    // Vérifier si GLTFLoader est disponible
    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
        console.warn('GLTFLoader non disponible, utilisation de la voiture de secours.');
        createFallbackCar();
        return;
    }
    
    loadCarModel();
}

// Fonction pour charger le modèle de voiture
function loadCarModel() {
    // Supprimer l'ancien modèle s'il existe
    if (car && car.children.length > 0) {
        // Supprimer tous les enfants du groupe car
        while (car.children.length > 0) {
            car.remove(car.children[0]);
        }
    }
    
    const loader = new THREE.GLTFLoader();
    
    // Déterminer le chemin du modèle selon la sélection
    const modelPath = selectedCarModel === 'octane' 
        ? 'model/octane/scene.gltf' 
        : 'model/fennnec/scene.gltf';
    const modelName = selectedCarModel === 'octane' ? 'Octane' : 'Fennec';
    
    loader.load(
        modelPath,
        function(gltf) {
            console.log(`Modèle ${modelName} chargé avec succès!`);
            const model = gltf.scene;
            
            // Activer les ombres sur tous les meshes du modèle
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Ajuster l'échelle si nécessaire (le modèle peut être trop grand ou trop petit)
            // Les modèles GLTF peuvent avoir des échelles différentes
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            
            // Si le modèle est trop grand (plus de 5 unités), le réduire
            if (maxDimension > 5) {
                const scale = 3 / maxDimension;
                model.scale.set(scale, scale, scale);
                console.log('Modèle redimensionné avec échelle:', scale);
                // Recalculer la bounding box après redimensionnement
                box.setFromObject(model);
            }
            
            // Corriger la rotation : si le modèle est orienté à 90° vers la gauche, on le tourne de -90°
            // (ou +90° selon le sens, on essaie -90° d'abord)
            model.rotation.y = -Math.PI / 2; // Rotation de -90 degrés pour corriger l'orientation
            
            // Calculer la position Y pour que la voiture touche le sol
            // Le sol est à y = 0, donc on doit ajuster la position Y du groupe car
            const center = box.getCenter(new THREE.Vector3());
            const minY = box.min.y;
            
            // Ajuster la position Y pour que le bas du modèle soit au niveau du sol
            // Le modèle a son centre à center.y, et le bas est à minY
            // On veut que minY soit à 0 (niveau du sol), donc on décale de -minY
            const offsetY = -minY;
            
            // Ajouter le modèle au groupe voiture
            car.add(model);
            
            // Ajuster la position Y de la voiture pour qu'elle touche le sol
            car.position.y = offsetY;
            
            console.log('Modèle positionné - Centre Y:', center.y, 'Min Y:', minY, 'Offset Y:', offsetY);
            
            // Sauvegarder la hauteur de référence au sol
            carGroundY = car.position.y;
        },
        function(xhr) {
            // Progression du chargement
            const percent = (xhr.loaded / xhr.total * 100);
            if (percent % 10 < 1) { // Log tous les 10%
                console.log('Chargement du modèle:', Math.round(percent) + '%');
            }
        },
        function(error) {
            console.error('Erreur lors du chargement du modèle GLTF:', error);
            console.log('Utilisation de la voiture de secours...');
            // En cas d'erreur, créer une voiture simple de secours
            createFallbackCar();
        }
    );
}

// Voiture de secours en cas d'erreur de chargement
function createFallbackCar() {
    // Ne créer la voiture de secours que si car est vide
    if (car.children.length > 0) {
        return; // Le modèle est déjà chargé
    }
    
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x4facfe,
        roughness: 0.3,
        metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    car.add(body);
    
    // Hauteur de référence simplifiée pour la voiture de secours
    carGroundY = 1;
}

// Créer la voiture IA (opponent - Octane)
function createOpponentCar() {
    opponentCar = new THREE.Group();
    
    // Position initiale - même distance que le joueur par rapport à la balle, de l'autre côté
    // Joueur : x = -20, IA : x = 20
    opponentCar.position.set(20, 0, 0);
    opponentCarGroundY = 0;
    // Orientation opposée au joueur : -90° (-Math.PI / 2), direction négative Z (vers "le bas" de l'écran)
    opponentCarRotation = -Math.PI / 2;
    opponentCar.rotation.y = opponentCarRotation;
    opponentCar.castShadow = true;
    scene.add(opponentCar);
    
    // Vérifier si GLTFLoader est disponible
    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
        console.warn('GLTFLoader non disponible, utilisation de la voiture de secours pour l\'IA.');
        createFallbackOpponentCar();
        return;
    }
    
    loadOpponentCarModel();
}

// Fonction pour charger le modèle de voiture IA (toujours Octane)
function loadOpponentCarModel() {
    // Supprimer l'ancien modèle s'il existe
    if (opponentCar && opponentCar.children.length > 0) {
        while (opponentCar.children.length > 0) {
            opponentCar.remove(opponentCar.children[0]);
        }
    }
    
    const loader = new THREE.GLTFLoader();
    
    // Toujours charger l'Octane pour l'IA
    const modelPath = 'model/octane/scene.gltf';
    
    loader.load(
        modelPath,
        function(gltf) {
            console.log('Modèle Octane (IA) chargé avec succès!');
            const model = gltf.scene;
            
            // Activer les ombres sur tous les meshes du modèle
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Ajuster l'échelle si nécessaire
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            
            if (maxDimension > 5) {
                const scale = 3 / maxDimension;
                model.scale.set(scale, scale, scale);
                console.log('Modèle IA redimensionné avec échelle:', scale);
                box.setFromObject(model);
            }
            
            // Corriger la rotation
            model.rotation.y = -Math.PI / 2;
            
            // Calculer la position Y pour que la voiture touche le sol
            const center = box.getCenter(new THREE.Vector3());
            const minY = box.min.y;
            const offsetY = -minY;
            
            opponentCar.add(model);
            opponentCar.position.y = offsetY;
            opponentCarGroundY = opponentCar.position.y;
            
            console.log('Modèle IA positionné - Centre Y:', center.y, 'Min Y:', minY, 'Offset Y:', offsetY);
        },
        function(xhr) {
            const percent = (xhr.loaded / xhr.total * 100);
            if (percent % 10 < 1) {
                console.log('Chargement du modèle IA:', Math.round(percent) + '%');
            }
        },
        function(error) {
            console.error('Erreur lors du chargement du modèle GLTF IA:', error);
            console.log('Utilisation de la voiture de secours pour l\'IA...');
            createFallbackOpponentCar();
        }
    );
}

// Voiture de secours pour l'IA
function createFallbackOpponentCar() {
    if (opponentCar.children.length > 0) {
        return;
    }
    
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 3);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6b00, // Couleur orange pour différencier
        roughness: 0.3,
        metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    opponentCar.add(body);
    
    opponentCarGroundY = 1;
}

// Créer la balle (charger le modèle GLTF)
function createBall() {
    ball = new THREE.Group();
    
    // Position initiale - ajouter immédiatement à la scène
    ball.position.set(0, 1, 0);
    scene.add(ball);
    
    // Vérifier si GLTFLoader est disponible
    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
        console.warn('GLTFLoader non disponible, utilisation de la balle de secours.');
        createFallbackBall();
        return;
    }
    
    loadBallModel();
}

// Fonction pour charger le modèle de balle
function loadBallModel() {
    const loader = new THREE.GLTFLoader();
    
    loader.load(
        'model/ball/scene.gltf',
        function(gltf) {
            console.log('Modèle balle chargé avec succès!');
            const model = gltf.scene;
            
            // Activer les ombres sur tous les meshes du modèle
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Ajuster l'échelle si nécessaire
            const box = new THREE.Box3().setFromObject(model);
            const modelSize = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
            
            // Si le modèle est trop grand ou trop petit, l'ajuster à une taille standard (rayon ~1)
            const targetSize = 2; // Diamètre de 2 unités (rayon de 1)
            if (Math.abs(maxDimension - targetSize) > 0.1) {
                const scale = targetSize / maxDimension;
                model.scale.set(scale, scale, scale);
                console.log('Balle redimensionnée avec échelle:', scale);
                // Recalculer la bounding box après redimensionnement
                box.setFromObject(model);
            }
            
            // Ajouter le modèle au groupe balle
            ball.add(model);
            
            // Calculer la position Y pour que la balle touche le sol
            // Pour une balle sphérique, on veut que le bas touche le sol (y = 0)
            const center = box.getCenter(new THREE.Vector3());
            const finalSize = box.getSize(new THREE.Vector3());
            const radius = Math.max(finalSize.x, finalSize.y, finalSize.z) / 2;
            const minY = box.min.y;
            
            // Le bas du modèle est à minY par rapport au centre du groupe
            // On ajoute un léger offset minimal pour qu'elle effleure le sol
            const offsetY = -minY + 0.7;
            
            // Ajuster la position Y de la balle pour qu'elle touche le sol
            ball.position.y = offsetY;
            
            console.log('Balle positionnée - Centre Y:', center.y, 'Min Y:', minY, 'Rayon:', radius, 'Position Y:', offsetY);
        },
        function(xhr) {
            // Progression du chargement
            const percent = (xhr.loaded / xhr.total * 100);
            if (percent % 10 < 1) { // Log tous les 10%
                console.log('Chargement de la balle:', Math.round(percent) + '%');
            }
        },
        function(error) {
            console.error('Erreur lors du chargement du modèle de balle GLTF:', error);
            console.log('Utilisation de la balle de secours...');
            // En cas d'erreur, créer une balle simple de secours
            createFallbackBall();
        }
    );
}

// Balle de secours en cas d'erreur de chargement
function createFallbackBall() {
    // Ne créer la balle de secours que si ball est vide
    if (ball.children.length > 0) {
        return; // Le modèle est déjà chargé
    }
    
    const ballGeometry = new THREE.SphereGeometry(1, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.2
    });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    ball.add(ballMesh);
    
    // Positionner la balle au sol
    ball.position.y = 1;
}

// Configuration des contrôles
function setupControls() {
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        // Contrôles de mouvement selon le mode clavier
        if (keyboardMode) {
            // Mode AZERTY (ZQSD)
            switch(key) {
                case 'z': controls.forward = true; break;
                case 's': controls.backward = true; break;
                case 'q': controls.left = true; break;
                case 'd': controls.right = true; break;
            }
        } else {
            // Mode QWERTY (WASD)
            switch(key) {
                case 'w': controls.forward = true; break;
                case 's': controls.backward = true; break;
                case 'a': controls.left = true; break;
                case 'd': controls.right = true; break;
            }
        }
        
        // Contrôles communs
        switch(key) {
            case 'arrowleft': controls.rotateLeft = true; break;
            case 'arrowright': controls.rotateRight = true; break;
            // Espace = saut / double saut, Shift = boost (comme Rocket League)
            case ' ': handleJump(); e.preventDefault(); break;
            case 'shift': controls.boost = true; break;
            case 'r': resetBall(); break;
            case 'f': resetCar(); break;
            case 'm': toggleKeyboardMode(); break;
            case 'l': toggleLanguageMode(); break;
            case 'n': nextMusic(); break; // Passer à la musique suivante
        }
        
        // Dans Rocket League, Q/D (ou A/D) font aussi tourner
        // On garde les flèches comme alternative
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        
        // Contrôles de mouvement selon le mode clavier
        if (keyboardMode) {
            // Mode AZERTY (ZQSD)
            switch(key) {
                case 'z': controls.forward = false; break;
                case 's': controls.backward = false; break;
                case 'q': controls.left = false; break;
                case 'd': controls.right = false; break;
            }
        } else {
            // Mode QWERTY (WASD)
            switch(key) {
                case 'w': controls.forward = false; break;
                case 's': controls.backward = false; break;
                case 'a': controls.left = false; break;
                case 'd': controls.right = false; break;
            }
        }
        
        // Contrôles communs
        switch(key) {
            case 'arrowleft': controls.rotateLeft = false; break;
            case 'arrowright': controls.rotateRight = false; break;
            case 'shift': controls.boost = false; break;
        }
    });
}

// Basculer entre les modes de clavier
function toggleKeyboardMode() {
    keyboardMode = !keyboardMode;
    updateControlsDisplay();
    savePreferences();
}

// Basculer entre français et anglais
function toggleLanguageMode() {
    languageMode = languageMode === 'fr' ? 'en' : 'fr';
    updateControlsDisplay();
    updateLanguageTexts();
    savePreferences();
}

// Gestion du saut et du dash (double saut directionnel)
function handleJump() {
    const now = Date.now();

    // Premier saut
    if (carIsOnGround) {
        carVerticalVelocity = carJumpForce;
        carIsOnGround = false;
        hasJumpedOnce = true;
        canDoubleJump = true;
        firstJumpTime = now;
        playJumpSound();
        return;
    }

    // Double saut / dash
    if (canDoubleJump && hasJumpedOnce && (now - firstJumpTime) <= doubleJumpWindow) {
        canDoubleJump = false;

        // Direction actuelle de la voiture
        const forwardDirection = new THREE.Vector3(
            Math.sin(carRotation),
            0,
            Math.cos(carRotation)
        );

        // Impulsion de dash vers l'avant
        const dashStrength = carSpeed * 4.0;
        carVelocity.add(forwardDirection.multiplyScalar(dashStrength));

        // Petit boost vertical, en gardant l'inertie actuelle si elle est déjà plus forte
        carVerticalVelocity = Math.max(carVerticalVelocity, carJumpForce * 0.7);

        // Lancer une animation de frontflip (360° vers l'avant)
        isFrontFlipping = true;
        frontFlipStartTime = now;
        
        // Son de dash (plus court et plus aigu)
        playJumpSound();
    }
}

// Mettre à jour tous les textes statiques selon la langue
function updateLanguageTexts() {
    // Statistiques dans le menu
    const statLabels = document.querySelectorAll('.stats .stat-item .stat-label');
    if (statLabels.length >= 4) {
        if (languageMode === 'fr') {
            statLabels[0].textContent = 'Mode clavier:';
            statLabels[1].textContent = 'Buts marqués:';
            statLabels[2].textContent = 'Vitesse:';
            statLabels[3].textContent = 'Boost:';
        } else {
            statLabels[0].textContent = 'Keyboard:';
            statLabels[1].textContent = 'Goals:';
            statLabels[2].textContent = 'Speed:';
            statLabels[3].textContent = 'Boost:';
        }
    }

    // Libellé du mode clavier
    const modeIndicator = document.getElementById('keyboard-mode');
    if (modeIndicator) {
        if (keyboardMode) {
            modeIndicator.textContent = languageMode === 'fr' ? 'AZERTY (ZQSD)' : 'AZERTY (ZQSD)';
        } else {
            modeIndicator.textContent = languageMode === 'fr' ? 'QWERTY (WASD)' : 'QWERTY (WASD)';
        }
    }

    // HUD : label buts, unité de vitesse, texte boost
    const hudGoalsLabel = document.querySelector('.hud-goals-label');
    const hudSpeedUnit = document.querySelector('.hud-speed-unit');
    const hudBoostUnit = document.querySelector('.hud-boost-unit');

    if (hudGoalsLabel) {
        hudGoalsLabel.textContent = languageMode === 'fr' ? 'BUTS' : 'GOALS';
    }
    if (hudSpeedUnit) {
        hudSpeedUnit.textContent = languageMode === 'fr' ? 'KM/H' : 'KM/H';
    }
    if (hudBoostUnit) {
        hudBoostUnit.textContent = languageMode === 'fr' ? 'BOOST' : 'BOOST';
    }

    // Message de but
    const goalMsg = document.getElementById('goalMessage');
    if (goalMsg) {
        goalMsg.textContent = languageMode === 'fr' ? 'BUT !' : 'GOAL!';
    }
    
    // Section audio
    const audioSection = document.querySelector('.audio-section h3');
    const volumeLabels = document.querySelectorAll('.volume-label span:first-child');
    if (audioSection) {
        audioSection.textContent = languageMode === 'fr' ? 'Audio' : 'Audio';
    }
    if (volumeLabels.length > 0) {
        // Premier label = Volume général
        volumeLabels[0].textContent = languageMode === 'fr' ? 'Volume' : 'Volume';
        // Deuxième label = Volume musique (si existe)
        if (volumeLabels.length > 1) {
            volumeLabels[1].textContent = languageMode === 'fr' ? 'Volume Musique' : 'Music Volume';
        }
    }
    
    // Boutons Match et Freeplay (pas besoin de mettre à jour le texte, ils sont statiques)
    
    // Nom de la voiture (déjà géré par updateCarName mais on peut forcer la mise à jour)
    updateCarName();
    
    // Bouton retour à l'accueil
    const backToLandingBtn = document.getElementById('backToLandingBtn');
    if (backToLandingBtn) {
        backToLandingBtn.textContent = languageMode === 'fr' ? '🏠 Retour à l\'accueil' : '🏠 Back to Home';
    }
}

// Mettre à jour l'affichage des contrôles
function updateControlsDisplay() {
    const controlsText = document.getElementById('controls-text');
    if (controlsText) {
        if (keyboardMode) {
            if (languageMode === 'fr') {
                controlsText.innerHTML = `
                    <p><strong>Z</strong> : Avancer</p>
                    <p><strong>S</strong> : Reculer</p>
                    <p><strong>Q</strong> : Tourner à gauche</p>
                    <p><strong>D</strong> : Tourner à droite</p>
                    <p><strong>Espace</strong> : Saut / double saut</p>
                    <p><strong>Shift</strong> : Boost</p>
                    <p><strong>R</strong> : Réinitialiser la balle</p>
                    <p><strong>F</strong> : Réinitialiser la voiture</p>
                    <p><strong>M</strong> : Basculer en mode QWERTY (WASD)</p>
                    <p><strong>L</strong> : Changer la langue (FR / EN)</p>
                    <p><strong>N</strong> : Musique suivante</p>
                    <p><strong>ESC</strong> : Ouvrir/Fermer le menu</p>
                `;
            } else {
                controlsText.innerHTML = `
                    <p><strong>Z</strong> : Forward</p>
                    <p><strong>S</strong> : Backward</p>
                    <p><strong>Q</strong> : Turn left</p>
                    <p><strong>D</strong> : Turn right</p>
                    <p><strong>Space</strong> : Jump / double jump</p>
                    <p><strong>Shift</strong> : Boost</p>
                    <p><strong>R</strong> : Reset ball</p>
                    <p><strong>F</strong> : Reset car</p>
                    <p><strong>M</strong> : Toggle keyboard mode (WASD)</p>
                    <p><strong>L</strong> : Change language (FR / EN)</p>
                    <p><strong>N</strong> : Next music</p>
                    <p><strong>ESC</strong> : Open/Close menu</p>
                `;
            }
        } else {
            if (languageMode === 'fr') {
                controlsText.innerHTML = `
                    <p><strong>W</strong> : Avancer</p>
                    <p><strong>S</strong> : Reculer</p>
                    <p><strong>A</strong> : Tourner à gauche</p>
                    <p><strong>D</strong> : Tourner à droite</p>
                    <p><strong>Espace</strong> : Saut / double saut</p>
                    <p><strong>Shift</strong> : Boost</p>
                    <p><strong>R</strong> : Réinitialiser la balle</p>
                    <p><strong>F</strong> : Réinitialiser la voiture</p>
                    <p><strong>M</strong> : Basculer en mode AZERTY (ZQSD)</p>
                    <p><strong>L</strong> : Changer la langue (FR / EN)</p>
                    <p><strong>N</strong> : Musique suivante</p>
                    <p><strong>ESC</strong> : Ouvrir/Fermer le menu</p>
                `;
            } else {
                controlsText.innerHTML = `
                    <p><strong>W</strong> : Forward</p>
                    <p><strong>S</strong> : Backward</p>
                    <p><strong>A</strong> : Turn left</p>
                    <p><strong>D</strong> : Turn right</p>
                    <p><strong>Space</strong> : Jump / double jump</p>
                    <p><strong>Shift</strong> : Boost</p>
                    <p><strong>R</strong> : Reset ball</p>
                    <p><strong>F</strong> : Reset car</p>
                    <p><strong>M</strong> : Toggle keyboard mode (ZQSD)</p>
                    <p><strong>L</strong> : Change language (FR / EN)</p>
                    <p><strong>N</strong> : Next music</p>
                    <p><strong>ESC</strong> : Open/Close menu</p>
                `;
            }
        }
    }
    
    const modeIndicator = document.getElementById('keyboard-mode');
    if (modeIndicator) {
        modeIndicator.textContent = keyboardMode ? 'AZERTY (ZQSD)' : 'QWERTY (WASD)';
    }
}

// Mise à jour de la voiture IA
function updateOpponentCar() {
    if (!opponentCar || !ball || !car) return;
    
    // Position de la cage bleue (gauche, x=-50) - cible de l'IA
    const targetGoalX = -50;
    const targetGoalZ = 0;
    
    // Distance du joueur à la balle
    const playerDistanceToBall = car.position.distanceTo(ball.position);
    const opponentDistanceToBall = opponentCar.position.distanceTo(ball.position);
    
    // Position de la balle par rapport aux cages
    const ballX = ball.position.x;
    const ballZ = ball.position.z;
    
    // Vérifier si l'IA est bloquée (vitesse très faible)
    const currentSpeed = opponentCarVelocity.length();
    const isStuck = currentSpeed < 0.1 && opponentDistanceToBall > 5;
    
    // Stratégie : l'IA doit essayer de marquer dans les cages bleues (gauche)
    // Elle doit intervenir si :
    // 1. La balle est de son côté (x > -10) OU
    // 2. La balle est proche des cages bleues (x < -20) OU
    // 3. Le joueur est loin de la balle et l'IA est plus proche OU
    // 4. L'IA est bloquée (doit se débloquer)
    
    const shouldIntervene = 
        ballX > -10 || // Balle de son côté (seuil plus permissif)
        ballX < -20 || // Balle proche des cages bleues
        (playerDistanceToBall > 12 && opponentDistanceToBall < playerDistanceToBall * 1.3) || // IA relativement proche
        isStuck; // IA bloquée, doit se débloquer
    
    // Si l'IA ne doit pas intervenir, rester en position défensive (mais toujours bouger)
    if (!shouldIntervene) {
        // Position défensive : rester entre la balle et les cages bleues
        const defensiveX = Math.max(-30, Math.min(10, ballX * 0.5));
        const defensiveZ = ballZ * 0.3;
        const defensiveTarget = new THREE.Vector3(defensiveX, 0, defensiveZ);
        
        const directionToDefensive = new THREE.Vector3()
            .subVectors(defensiveTarget, opponentCar.position)
            .normalize();
        
        const targetAngle = Math.atan2(directionToDefensive.x, directionToDefensive.z);
        let angleDiff = targetAngle - opponentCarRotation;
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        if (Math.abs(angleDiff) > 0.1) {
            if (angleDiff > 0) {
                opponentCarRotation += carRotationSpeed * 1.2;
            } else {
                opponentCarRotation -= carRotationSpeed * 1.2;
            }
        }
        
        opponentCar.rotation.y = opponentCarRotation;
        
        // Se déplacer lentement vers la position défensive
        const forwardDirection = new THREE.Vector3(
            Math.sin(opponentCarRotation),
            0,
            Math.cos(opponentCarRotation)
        );
        
        const distanceToDefensive = opponentCar.position.distanceTo(defensiveTarget);
        
        // Toujours essayer de bouger vers la position défensive
        const currentSpeedInDirection = opponentCarVelocity.dot(forwardDirection);
        const targetSpeed = distanceToDefensive > 8 ? carSpeed * 0.8 : carSpeed * 0.5;
        
        // S'assurer qu'on bouge toujours un peu
        if (currentSpeedInDirection < targetSpeed || currentSpeed < 0.2) {
            const acceleration = Math.min(accelerationRate * 1.0, targetSpeed - currentSpeedInDirection);
            opponentCarVelocity.add(forwardDirection.clone().multiplyScalar(acceleration));
        }
        
        // Appliquer friction (moins forte pour éviter de s'arrêter complètement)
        opponentCarVelocity.multiplyScalar(0.95);
        
        // Ne jamais s'arrêter complètement si on est loin de la cible
        if (opponentCarVelocity.length() < 0.05 && distanceToDefensive > 3) {
            // Forcer un petit mouvement
            opponentCarVelocity.add(forwardDirection.clone().multiplyScalar(carSpeed * 0.3));
        }
        
        const maxSpeed = carSpeed * 1.0;
        if (opponentCarVelocity.length() > maxSpeed) {
            opponentCarVelocity.normalize().multiplyScalar(maxSpeed);
        }
        
        opponentCar.position.add(opponentCarVelocity);
        opponentCar.position.x = Math.max(-48, Math.min(48, opponentCar.position.x));
        opponentCar.position.z = Math.max(-38, Math.min(38, opponentCar.position.z));
        
        // Physique verticale
        opponentCarVerticalVelocity += carGravity;
        opponentCar.position.y += opponentCarVerticalVelocity;
        const groundY = opponentCarGroundY || 0;
        if (opponentCar.position.y <= groundY) {
            opponentCar.position.y = groundY;
            opponentCarVerticalVelocity = 0;
            opponentCarIsOnGround = true;
        } else {
            opponentCarIsOnGround = false;
        }
        
        if (opponentCarBoostAmount < 100) {
            opponentCarBoostAmount = Math.min(100, opponentCarBoostAmount + boostRegen * 0.8);
        }
        
        return; // Sortir de la fonction si on est en mode défensif
    }
    
    // Mode offensif : essayer de marquer dans les cages bleues (gauche, x=-50)
    // IMPORTANT : L'IA ne doit JAMAIS pousser la balle vers les cages oranges (droite, x=50) - son propre camp
    
    // Position des cages oranges (son propre camp - à éviter)
    const ownGoalX = 50; // Cages oranges à droite
    
    // Vérifier si la balle est proche des cages oranges (son propre camp)
    const ballNearOwnGoal = ballX > 40;
    
    // Calculer la direction de la balle vers les cages bleues (objectif)
    const directionToGoal = new THREE.Vector3(
        targetGoalX - ballX,
        0,
        targetGoalZ - ballZ
    ).normalize();
    
    // Calculer la distance de la balle aux cages bleues
    const ballDistanceToGoal = Math.sqrt(
        Math.pow(ballX - targetGoalX, 2) + 
        Math.pow(ballZ - targetGoalZ, 2)
    );
    
    // Stratégie selon la position de la balle
    let targetPosition;
    
    // Si la balle est proche des cages oranges (son propre camp), se positionner pour la dégager
    if (ballNearOwnGoal) {
        // Dégager la balle vers le centre du terrain, loin des cages oranges
        const clearDirection = new THREE.Vector3(
            -1, // Vers la gauche (loin des cages oranges)
            0,
            0
        ).normalize();
        
        // Se positionner derrière la balle pour la dégager
        targetPosition = new THREE.Vector3(
            ballX - clearDirection.x * 3,
            0,
            ballZ
        );
    } else if (ballX < -35) {
        // Balle très proche des cages bleues : viser directement les cages
        targetPosition = new THREE.Vector3(targetGoalX, 0, ballZ);
    } else if (ballX < -20) {
        // Balle proche des cages bleues : se positionner pour pousser vers les cages
        const pushDirection = new THREE.Vector3(
            targetGoalX - ballX,
            0,
            targetGoalZ - ballZ
        ).normalize();
        
        // Se positionner derrière la balle dans la direction des cages bleues
        targetPosition = new THREE.Vector3(
            ballX - pushDirection.x * 2.5,
            0,
            ballZ - pushDirection.z * 2.5
        );
    } else if (ballX > 10) {
        // Balle loin des cages bleues : aller vers la balle pour la récupérer
        targetPosition = ball.position.clone();
    } else {
        // Zone intermédiaire : se positionner pour pousser la balle vers les cages bleues
        const angleToGoal = Math.atan2(targetGoalX - ballX, targetGoalZ - ballZ);
        
        // Position optimale : derrière la balle, dans la direction des cages bleues
        const approachDistance = 3.5;
        
        targetPosition = new THREE.Vector3(
            ballX - Math.sin(angleToGoal) * approachDistance,
            0,
            ballZ - Math.cos(angleToGoal) * approachDistance
        );
    }
    
    const directionToTarget = new THREE.Vector3()
        .subVectors(targetPosition, opponentCar.position)
        .normalize();
    
    // Calculer l'angle vers la cible
    const targetAngle = Math.atan2(directionToTarget.x, directionToTarget.z);
    
    // Calculer la différence d'angle
    let angleDiff = targetAngle - opponentCarRotation;
    
    // Normaliser l'angle entre -PI et PI
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Tourner vers la cible (rotation plus rapide si proche)
    const rotationThreshold = 0.1;
    const rotationSpeed = opponentDistanceToBall < 8 ? carRotationSpeed * 2.0 : carRotationSpeed * 1.5;
    
    if (Math.abs(angleDiff) > rotationThreshold) {
        if (angleDiff > 0) {
            opponentCarRotation += rotationSpeed;
        } else {
            opponentCarRotation -= rotationSpeed;
        }
    }
    
    // Mettre à jour la rotation visuelle
    opponentCar.rotation.y = opponentCarRotation;
    
    // Direction actuelle de la voiture IA
    const forwardDirection = new THREE.Vector3(
        Math.sin(opponentCarRotation),
        0,
        Math.cos(opponentCarRotation)
    );
    
    // Distance à la cible
    const distanceToTarget = opponentCar.position.distanceTo(targetPosition);
    
    // Vérifier si l'IA a raté la balle (balle s'éloigne)
    const ballVelocityMagnitude = ballVelocity.length();
    const ballMovingAway = ballVelocity.x > 0.1 && ballX > opponentCar.position.x;
    
    // Ralentir si on est très proche pour éviter de traverser (mais pas trop)
    if (distanceToTarget < 2.5) {
        opponentCarVelocity.multiplyScalar(0.85);
    }
    
    // Toujours essayer d'accélérer vers la cible
    const currentSpeedInDirection = opponentCarVelocity.dot(forwardDirection);
    
    // Vitesse cible adaptée selon la situation
    let targetSpeed;
    if (ballX < -25 && ballDistanceToGoal < 20) {
        // Proche des cages : vitesse plus élevée pour pousser la balle
        targetSpeed = carSpeed * 1.5;
    } else if (ballX > 15 || ballMovingAway) {
        // Loin des cages ou balle qui s'éloigne : vitesse plus élevée pour récupérer
        targetSpeed = carSpeed * 1.4;
    } else {
        // Zone intermédiaire : vitesse modérée
        targetSpeed = carSpeed * 1.2;
    }
    
    // Réduire la vitesse cible si on est très proche de la cible
    const adjustedTargetSpeed = distanceToTarget < 3.0 ? carSpeed * 0.9 : targetSpeed;
    
    // Toujours accélérer si on n'est pas à la vitesse cible
    if (currentSpeedInDirection < adjustedTargetSpeed || currentSpeed < 0.2) {
        const acceleration = Math.min(accelerationRate * 1.4, adjustedTargetSpeed - currentSpeedInDirection);
        opponentCarVelocity.add(forwardDirection.clone().multiplyScalar(acceleration));
    }
    
    // Si l'IA est bloquée ou a raté la balle, forcer un mouvement
    if (isStuck || (ballMovingAway && opponentDistanceToBall > 8)) {
        // Forcer un mouvement vers la balle
        const recoveryAcceleration = carSpeed * 0.8;
        opponentCarVelocity.add(forwardDirection.clone().multiplyScalar(recoveryAcceleration));
    }
    
    // Utiliser le boost stratégiquement :
    // - Si la balle est proche des cages bleues et qu'on est aligné
    // - Si on est loin de la balle et qu'on a du boost
    // - Si on a raté la balle et qu'elle s'éloigne
    const shouldBoost = (ballX < -25 && ballDistanceToGoal < 25 && Math.abs(angleDiff) < Math.PI / 4) ||
                       (distanceToTarget > 18 && opponentCarBoostAmount > 15) ||
                       (ballMovingAway && opponentDistanceToBall > 10 && opponentCarBoostAmount > 20);
    
    if (shouldBoost && opponentCarBoostAmount > 10) {
        const boostForce = carSpeed * boostMultiplier * 0.5;
        opponentCarVelocity.add(forwardDirection.clone().multiplyScalar(boostForce));
        opponentCarBoostAmount = Math.max(0, opponentCarBoostAmount - boostConsumption * 0.9);
    }
    
    // Friction (moins forte pour éviter de s'arrêter)
    const frictionFactor = 0.95;
    opponentCarVelocity.multiplyScalar(frictionFactor);
    
    // Ne jamais s'arrêter complètement si on a une cible
    // Si la vitesse est très faible et qu'on est loin de la cible, forcer un mouvement
    if (opponentCarVelocity.length() < 0.1 && distanceToTarget > 3) {
        // Forcer un petit mouvement vers la cible
        opponentCarVelocity.add(forwardDirection.clone().multiplyScalar(carSpeed * 0.4));
    }
    
    // Limiter la vitesse maximale
    const maxSpeed = opponentCarBoostAmount > 0 ? carSpeed * 2.5 : carSpeed * 1.5;
    if (opponentCarVelocity.length() > maxSpeed) {
        opponentCarVelocity.normalize().multiplyScalar(maxSpeed);
    }
    
    // Appliquer le mouvement
    opponentCar.position.add(opponentCarVelocity);
    
    // Limites du terrain
    opponentCar.position.x = Math.max(-48, Math.min(48, opponentCar.position.x));
    opponentCar.position.z = Math.max(-38, Math.min(38, opponentCar.position.z));
    
    // Physique verticale
    opponentCarVerticalVelocity += carGravity;
    opponentCar.position.y += opponentCarVerticalVelocity;
    
    // Collision avec le sol
    const groundY = opponentCarGroundY || 0;
    if (opponentCar.position.y <= groundY) {
        opponentCar.position.y = groundY;
        opponentCarVerticalVelocity = 0;
        opponentCarIsOnGround = true;
    } else {
        opponentCarIsOnGround = false;
    }
    
    // Recharger le boost
    if (opponentCarBoostAmount < 100) {
        opponentCarBoostAmount = Math.min(100, opponentCarBoostAmount + boostRegen * 0.8);
    }
}

// Mise à jour de la voiture
function updateCar() {
    // Vérifier que car existe
    if (!car) return;
    
    // Calculer la vitesse actuelle
    const currentSpeed = carVelocity.length();
    
    // Calculer la direction actuelle de la voiture
    const forwardDirection = new THREE.Vector3(
        Math.sin(carRotation),
        0,
        Math.cos(carRotation)
    );

    // Rotation de la voiture (comme une vraie voiture)
    // La rotation est plus efficace quand la voiture a de la vitesse
    // En marche arrière, la direction de rotation est inversée
    
    // Déterminer si on est en marche avant ou arrière
    const speedInDirection = carVelocity.dot(forwardDirection);
    const isReversing = speedInDirection < -0.05; // En marche arrière si vitesse négative dans la direction
    
    if (controls.left || controls.rotateLeft) {
        // La rotation dépend de la vitesse : plus on va vite, moins on tourne
        const rotationFactor = Math.min(1, currentSpeed / minSpeedForRotation);
        const effectiveRotationSpeed = carRotationSpeed * (0.3 + rotationFactor * 0.7);
        
        // En marche arrière, inverser la direction de rotation
        if (isReversing) {
            carRotation -= effectiveRotationSpeed; // Tourner à gauche en marche arrière = rotation inverse
        } else {
            carRotation += effectiveRotationSpeed; // Tourner à gauche en marche avant
        }
    }
    if (controls.right || controls.rotateRight) {
        const rotationFactor = Math.min(1, currentSpeed / minSpeedForRotation);
        const effectiveRotationSpeed = carRotationSpeed * (0.3 + rotationFactor * 0.7);
        
        // En marche arrière, inverser la direction de rotation
        if (isReversing) {
            carRotation += effectiveRotationSpeed; // Tourner à droite en marche arrière = rotation inverse
        } else {
            carRotation -= effectiveRotationSpeed; // Tourner à droite en marche avant
        }
    }
    
    // Mettre à jour la rotation visuelle de la voiture
    // On compose une rotation de yaw (orientation sur le terrain)
    // et éventuellement un frontflip (rotation locale sur l'axe avant/arrière de la voiture)
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        carRotation
    );

    if (isFrontFlipping) {
        const elapsed = Date.now() - frontFlipStartTime;
        const t = Math.min(1, elapsed / frontFlipDuration);
        // Interpolation douce (ease-in-out légère)
        const smoothT = t < 0.5
            ? 2 * t * t
            : -1 + (4 - 2 * t) * t;
        const angle = 2 * Math.PI * smoothT; // 360° vers l'arrière (sens inverse)

        const flipQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            angle
        );

        // La voiture regarde dans la bonne direction (yaw), puis on applique le flip par rapport à elle-même
        car.quaternion.copy(yawQuat).multiply(flipQuat);

        if (t >= 1) {
            isFrontFlipping = false;
            car.quaternion.copy(yawQuat); // Fin du flip: revenir à une orientation purement en yaw
        }
    } else {
        // Pas de flip: orientation uniquement en yaw
        car.quaternion.copy(yawQuat);
    }
    
    // Recalculer la direction après rotation (pour l'accélération)
    forwardDirection.set(
        Math.sin(carRotation),
        0,
        Math.cos(carRotation)
    );

    // Accélération progressive dans la direction où la voiture pointe
    if (controls.forward) {
        // Accélération progressive au lieu d'instantanée
        const targetSpeed = carSpeed * 1.5; // Vitesse cible maximale
        const currentSpeedInDirection = carVelocity.dot(forwardDirection);
        
        if (currentSpeedInDirection < targetSpeed) {
            // Accélérer progressivement vers la vitesse cible
            const acceleration = Math.min(accelerationRate, targetSpeed - currentSpeedInDirection);
            carVelocity.add(forwardDirection.clone().multiplyScalar(acceleration));
        }
    }
    if (controls.backward) {
        // Accélération progressive en arrière aussi
        const targetSpeed = -carSpeed * 0.6 * 1.5; // Vitesse cible maximale en arrière
        const currentSpeedInDirection = carVelocity.dot(forwardDirection);
        
        if (currentSpeedInDirection > targetSpeed) {
            const acceleration = Math.max(-accelerationRate, targetSpeed - currentSpeedInDirection);
            carVelocity.add(forwardDirection.clone().multiplyScalar(acceleration));
        }
    }

    // Boost dans la direction où la voiture pointe
    // On ne déclenche le boost que s'il reste plus de 0.5% de boost (cohérent avec l'affichage arrondi)
    let isBoosting = false;
    if (controls.boost && boostAmount > 0.5) {
        // Le boost ajoute de la vitesse directement, indépendamment de l'accélération progressive
        const boostForce = carSpeed * boostMultiplier * 0.5; // Augmenté de 0.4 à 0.5 pour plus d'effet
        carVelocity.add(forwardDirection.clone().multiplyScalar(boostForce));
        boostAmount = Math.max(0, boostAmount - boostConsumption);
        isBoosting = true;
        
        // Activer le son de boost
        if (!boostOscillator) {
            playBoostSound();
        }
    } else {
        // Arrêter le son de boost si on n'utilise plus le boost
        if (boostOscillator) {
            stopBoostSound();
        }
        
        if (!controls.boost && boostAmount < 100) {
            // Le boost ne se recharge que si on n'appuie pas sur la touche boost
            boostAmount = Math.min(100, boostAmount + boostRegen);
        }
    }

    // Friction (plus réaliste)
    const frictionFactor = 0.93;
    carVelocity.multiplyScalar(frictionFactor);

    // Arrêter si très lent
    if (carVelocity.length() < 0.05) {
        carVelocity.set(0, 0, 0);
    }

    // Limiter la vitesse maximale (plus élevée avec le boost)
    const maxSpeed = isBoosting ? carSpeed * 3.0 : carSpeed * 1.5;
    if (carVelocity.length() > maxSpeed) {
        carVelocity.normalize().multiplyScalar(maxSpeed);
    }

    // Appliquer le mouvement dans la direction de la vitesse
    car.position.add(carVelocity);

    // Limites du terrain (horizontales)
    car.position.x = Math.max(-48, Math.min(48, car.position.x));
    car.position.z = Math.max(-38, Math.min(38, car.position.z));
    
    // Physique verticale (saut / gravité)
    carVerticalVelocity += carGravity;
    car.position.y += carVerticalVelocity;

    // Collision avec le sol
    const groundY = carGroundY || 0;
    if (car.position.y <= groundY) {
        car.position.y = groundY;
        carVerticalVelocity = 0;
        if (!carIsOnGround) {
            carIsOnGround = true;
            hasJumpedOnce = false;
            canDoubleJump = false;
            isFrontFlipping = false;
        }
    } else {
        carIsOnGround = false;
    }

    // Effet de boost visuel (uniquement si boost est réellement consommé)
    if (isBoosting) {
        const boostEffect = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1, 8),
            new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.7 })
        );
        boostEffect.rotation.x = Math.PI;
        boostEffect.position.copy(car.position);
        boostEffect.position.add(forwardDirection.clone().multiplyScalar(-2));
        boostEffect.position.y = 0.5;
        scene.add(boostEffect);
        setTimeout(() => scene.remove(boostEffect), 100);
    }
    
    // Mettre à jour le son du moteur
    updateEngineSound();
}

// Mise à jour de la balle
let ballVelocity = new THREE.Vector3(0, 0, 0);
const ballFriction = 0.992; // Réduit pour plus d'inertie (la balle roule plus longtemps)
const ballBounce = 0.7;
const gravity = -0.02;
const ballMass = 1.0; // Masse de la balle pour l'inertie

function updateBall() {
    // Appliquer la gravité
    ballVelocity.y += gravity;

    // Friction avec inertie (la balle garde mieux sa vitesse)
    // Friction réduite pour plus d'inertie
    ballVelocity.x *= ballFriction;
    ballVelocity.z *= ballFriction;
    ballVelocity.y *= 0.995; // Moins de friction verticale aussi

    // Déplacement avec inertie
    // La balle continue à bouger même sans force appliquée
    ball.position.add(ballVelocity);

    // Collision avec le sol
    // Calculer la hauteur minimale de la balle
    let minBallY = 1; // Fallback
    if (ball.children.length > 0) {
        const box = new THREE.Box3().setFromObject(ball);
        const minY = box.min.y;
        // Le bas de la balle est à minY, on veut qu'elle effleure le sol
        minBallY = -minY + 0.6;
    }
    
    // Le bas de la balle doit être au minimum juste au-dessus du sol (y = 0.01)
    if (ball.position.y < minBallY) {
        ball.position.y = minBallY;
        ballVelocity.y *= -ballBounce;
        ballVelocity.x *= 0.9;
        ballVelocity.z *= 0.9;
    }

    // Collision avec les murs
    // Gestion spéciale pour laisser l'ouverture des cages (ne pas rebondir sur une "vitre" invisible)
    const goalWidth = 15;
    const goalHeight = 7;
    const goalZCenter = 0;

    const inGoalZRange = Math.abs(ball.position.z - goalZCenter) < (goalWidth / 2) + 0.5;
    const inGoalYRange = ball.position.y < goalHeight + 1 && ball.position.y > -0.5;

    // Murs gauche/droite (X)
    // 1) Bord du terrain (±48) : on laisse passer si on est dans la bouche du but
    if (ball.position.x > 48) {
        // Côté droit (but est)
        if (!(inGoalZRange && inGoalYRange)) {
            ballVelocity.x *= -ballBounce;
            ball.position.x = 48;
        }
    } else if (ball.position.x < -48) {
        // Côté gauche (but ouest)
        if (!(inGoalZRange && inGoalYRange)) {
            ballVelocity.x *= -ballBounce;
            ball.position.x = -48;
        }
    }

    // 2) Fond des cages : ajouter un mur derrière le but pour arrêter la balle
    const goalDepth = 4; // même profondeur que la cage (augmentée)
    const goalX = 50;
    const goalXWest = -50;

    // Fond du but droit (derrière le but, dans la zone du but uniquement)
    if (ball.position.x > goalX + goalDepth && inGoalZRange && inGoalYRange) {
        ball.position.x = goalX + goalDepth;
        ballVelocity.x *= -ballBounce;
    }

    // Fond du but gauche
    if (ball.position.x < goalXWest - goalDepth && inGoalZRange && inGoalYRange) {
        ball.position.x = goalXWest - goalDepth;
        ballVelocity.x *= -ballBounce;
    }
    if (ball.position.z > 38 || ball.position.z < -38) {
        ballVelocity.z *= -ballBounce;
        ball.position.z = Math.max(-38, Math.min(38, ball.position.z));
    }

    // Rotation de la balle
    ball.rotation.x += ballVelocity.z * 0.1;
    ball.rotation.z += ballVelocity.x * 0.1;
    
    // Vérifier si un but a été marqué
    checkGoal();
}

// Vérifier si un but a été marqué
function checkGoal() {
    const currentTime = Date.now();
    
    // Éviter les buts multiples rapides
    if (currentTime - lastGoalTime < goalCooldown) {
        return;
    }
    
    const goalWidth = 15; // Largeur du but
    const goalHeight = 7; // Hauteur du but
    const goalX = 50; // Position X du but (est)
    const goalXWest = -50; // Position X du but (ouest)
    const goalZCenter = 0; // Centre du but en Z
    const goalDepth = 4; // Profondeur du but (augmentée)
    
    // Vérifier le but est (droite) - zone élargie
    // La balle doit être derrière la ligne de but (x > 50) et dans les limites du but
    if (ball.position.x > goalX && ball.position.x < goalX + goalDepth + 2) {
        const zDistance = Math.abs(ball.position.z - goalZCenter);
        // Vérifier que la balle est dans la largeur du but (avec une petite marge)
        if (zDistance < (goalWidth / 2) + 1 && ball.position.y < goalHeight + 1 && ball.position.y > -0.5) {
            scoreGoal('right'); // But marqué à droite
            return;
        }
    }
    
    // Vérifier le but ouest (gauche) - zone élargie
    // La balle doit être derrière la ligne de but (x < -50) et dans les limites du but
    if (ball.position.x < goalXWest && ball.position.x > goalXWest - goalDepth - 2) {
        const zDistance = Math.abs(ball.position.z - goalZCenter);
        // Vérifier que la balle est dans la largeur du but (avec une petite marge)
        if (zDistance < (goalWidth / 2) + 1 && ball.position.y < goalHeight + 1 && ball.position.y > -0.5) {
            scoreGoal('left'); // But marqué à gauche
            return;
        }
    }
}

// Marquer un but
function scoreGoal(goalSide) {
    lastGoalTime = Date.now();
    
    // Déterminer qui a marqué (logique inversée comme dans Rocket League) :
    // - goalSide = 'right' (cages oranges à droite) = l'équipe bleue (IA) marque
    // - goalSide = 'left' (cages bleues à gauche) = l'équipe orange (joueur) marque
    if (goalSide === 'right') {
        // But dans les cages oranges (droite) = point pour l'équipe bleue (IA)
        opponentScore++;
        console.log('⚽ BUT IA (cages oranges) ! Score: ' + playerScore + ' - ' + opponentScore);
    } else if (goalSide === 'left') {
        // But dans les cages bleues (gauche) = point pour l'équipe orange (joueur)
        playerScore++;
        console.log('⚽ BUT JOUEUR (cages bleues) ! Score: ' + playerScore + ' - ' + opponentScore);
    }
    
    goalsScored = playerScore + opponentScore; // Score total pour compatibilité
    
    // Son de but
    playGoalSound();
    
    // Afficher \"GOAL!\" au centre de l'écran
    const goalMsg = document.getElementById('goalMessage');
    if (goalMsg) {
        goalMsg.classList.add('visible');
        // Masquer le message après 1.5s
        setTimeout(() => {
            goalMsg.classList.remove('visible');
        }, 1500);
    }
    
    // Mettre à jour l'affichage dans le menu
    const goalsElement = document.getElementById('goals');
    if (goalsElement) {
        goalsElement.textContent = goalsScored;
    }
    
    // Mettre à jour le HUD avec le score formaté
    updateScoreDisplay();
    
    // Réinitialiser la balle et les voitures après un court délai
    setTimeout(() => {
        resetBall();
        resetCar();
        resetOpponentCar();
    }, 500);
}

// Mettre fin au match (après le chrono)
function endMatch() {
    if (isMatchOver) return;
    isMatchOver = true;
    isInGame = false;
    
    // Déterminer le résultat
    let message = '';
    if (playerScore > opponentScore) {
        message = 'VICTOIRE ORANGE';
    } else if (opponentScore > playerScore) {
        message = 'VICTOIRE BLEUE';
    } else {
        message = 'MATCH NUL';
    }
    
    const goalMsg = document.getElementById('goalMessage');
    if (goalMsg) {
        goalMsg.textContent = message;
        goalMsg.classList.add('visible');
    }
    
    // Retour à l\'accueil après un court délai
    setTimeout(() => {
        if (goalMsg) {
            goalMsg.classList.remove('visible');
        }
        returnToLanding();
    }, 4000);
}

// Formater le temps (ms) en MM:SS
function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mStr = minutes.toString().padStart(2, '0');
    const sStr = seconds.toString().padStart(2, '0');
    return mStr + ':' + sStr;
}

// Mettre à jour l\'affichage du chrono
function updateMatchTimerDisplay(remainingMs) {
    const timerEl = document.getElementById('hud-timer');
    if (!timerEl) return;
    timerEl.textContent = formatTime(remainingMs);
}

// Mettre à jour le chrono à chaque frame
function updateMatchTimer() {
    if (!matchStartTime || isMatchOver) return;
    
    const now = Date.now();
    const elapsed = now - matchStartTime;
    const remaining = matchDurationMs - elapsed;
    
    if (remaining <= 0) {
        updateMatchTimerDisplay(0);
        endMatch();
    } else {
        updateMatchTimerDisplay(remaining);
    }
}

// Mettre à jour l'affichage du score
function updateScoreDisplay() {
    // Mettre à jour le HUD avec le format "IA (BLEU) - JOUEUR (ORANGE)" avec couleurs
    const hudGoalsEl = document.getElementById('hud-goals');
    if (hudGoalsEl) {
        // Créer le HTML avec des couleurs : bleu pour l'IA en premier, orange pour le joueur en second
        hudGoalsEl.innerHTML = '<span style="color: #1e90ff;">' + opponentScore + '</span> - <span style="color: #ff8c00;">' + playerScore + '</span>';
    }
    
    // Mettre à jour aussi dans le menu si nécessaire
    const goalsElement = document.getElementById('goals');
    if (goalsElement) {
        goalsElement.innerHTML = '<span style="color: #1e90ff;">' + opponentScore + '</span> - <span style="color: #ff8c00;">' + playerScore + '</span>';
    }
}

// Détection de collision voiture-balle
function checkCollision() {
    // Vérifier que car, ball et opponentCar existent
    if (!car || !ball) return;
    
    // Collision voiture joueur - balle
    const horizontalDistance = Math.sqrt(
        Math.pow(ball.position.x - car.position.x, 2) +
        Math.pow(ball.position.z - car.position.z, 2)
    );
    const verticalDistance = Math.abs(ball.position.y - car.position.y);
    const distance = car.position.distanceTo(ball.position);
    const collisionDistance = 2.8; // Légèrement augmenté pour mieux détecter

    if (distance < collisionDistance && horizontalDistance < 2.5 && verticalDistance < 3.0) {
        // Calculer la direction de la collision
        const collisionDir = new THREE.Vector3()
            .subVectors(ball.position, car.position)
            .normalize();

        // Vitesse de la voiture
        const carSpeedVector = carVelocity.clone();
        const carSpeedValue = carSpeedVector.length();
        
        // Son de collision (force normalisée entre 0 et 1)
        const maxSpeedForSound = carSpeed * 3.0; // Vitesse maximale possible
        const impactStrength = Math.min(1, carSpeedValue / maxSpeedForSound);
        playCollisionSound(impactStrength);
        
        // Appliquer la force à la balle avec inertie
        // La balle conserve mieux son momentum grâce à l'inertie
        const impactForce = carSpeedValue * 0.6 + 0.4; // Force d'impact
        const momentumTransfer = carSpeedValue * 0.4; // Transfert de momentum
        
        // Ajouter la force d'impact
        ballVelocity.add(collisionDir.multiplyScalar(impactForce));
        
        // Ajouter le momentum de la voiture (inertie)
        ballVelocity.add(carSpeedVector.multiplyScalar(momentumTransfer));
        
        // L'inertie fait que la balle garde mieux sa vitesse actuelle
        // On ne réduit pas trop la vitesse existante de la balle
        const currentBallSpeed = ballVelocity.length();
        if (currentBallSpeed > 0.1) {
            // Conserver une partie de la vitesse existante (inertie)
            ballVelocity.multiplyScalar(0.95); // Légère réduction pour éviter les vitesses infinies
        }

        // Repousser la balle pour éviter qu'elle traverse la voiture
        const overlap = collisionDistance - distance;
        if (overlap > 0) {
            ball.position.add(collisionDir.multiplyScalar(overlap + 0.3)); // Augmenter le buffer
        }
    }
    
    // Collision voiture IA - balle (seulement en mode match)
    if (opponentCar && gameMode === 'match' && opponentCar.visible) {
        // Calculer la distance horizontale (X, Z) et verticale (Y) séparément
        const horizontalDistance = Math.sqrt(
            Math.pow(ball.position.x - opponentCar.position.x, 2) +
            Math.pow(ball.position.z - opponentCar.position.z, 2)
        );
        const verticalDistance = Math.abs(ball.position.y - opponentCar.position.y);
        const totalDistance = opponentCar.position.distanceTo(ball.position);
        const opponentCollisionDistance = 2.8; // Légèrement augmenté pour mieux détecter

        // Vérifier la collision (distance horizontale et verticale raisonnable)
        if (totalDistance < opponentCollisionDistance && horizontalDistance < 2.5 && verticalDistance < 3.0) {
            // Calculer la direction de la collision
            const opponentCollisionDir = new THREE.Vector3()
                .subVectors(ball.position, opponentCar.position)
                .normalize();

            // Vitesse de la voiture IA
            const opponentSpeedVector = opponentCarVelocity.clone();
            const opponentSpeedValue = opponentSpeedVector.length();
            
            // Son de collision
            const maxSpeedForSound = carSpeed * 3.0;
            const impactStrength = Math.min(1, opponentSpeedValue / maxSpeedForSound);
            playCollisionSound(impactStrength);
            
            // Appliquer la force à la balle
            const impactForce = opponentSpeedValue * 0.6 + 0.4;
            const momentumTransfer = opponentSpeedValue * 0.4;
            
            // Calculer la direction après collision
            const newBallVelocity = ballVelocity.clone();
            newBallVelocity.add(opponentCollisionDir.multiplyScalar(impactForce));
            newBallVelocity.add(opponentSpeedVector.multiplyScalar(momentumTransfer));
            
            // Vérifier si la balle serait poussée vers les cages oranges (son propre camp)
            const ownGoalX = 50; // Cages oranges à droite
            const ballXAfterHit = ball.position.x + newBallVelocity.x * 0.1; // Position prévue
            
            // Si la balle serait poussée vers les cages oranges, réduire/corriger la force
            if (ballXAfterHit > 30 && newBallVelocity.x > 0.2) {
                // Réduire la composante X positive (vers les cages oranges)
                const correctionFactor = 0.3; // Réduire fortement la force vers les cages oranges
                newBallVelocity.x = newBallVelocity.x * correctionFactor;
                
                // Ajouter une petite force vers la gauche (loin des cages oranges)
                newBallVelocity.x -= 0.2;
            }
            
            ballVelocity.copy(newBallVelocity);
            
            const currentBallSpeed = ballVelocity.length();
            if (currentBallSpeed > 0.1) {
                ballVelocity.multiplyScalar(0.95);
            }

            // Repousser la balle pour éviter qu'elle traverse la voiture IA
            const overlap = opponentCollisionDistance - totalDistance;
            if (overlap > 0) {
                // Repousser plus fort pour éviter le traversement
                ball.position.add(opponentCollisionDir.multiplyScalar(overlap + 0.3));
            }
        }
    }
}

// Réinitialiser la balle
function resetBall() {
    ball.position.set(0, 0, 0);
    ballVelocity.set(0, 0, 0);
    ball.rotation.set(0, 0, 0);
    
    // Ajuster la position Y pour que la balle touche le sol
    if (ball.children.length > 0) {
        const box = new THREE.Box3().setFromObject(ball);
        const minY = box.min.y;
        // Positionner pour que le bas de la balle effleure le sol
        ball.position.y = -minY + 0.6;
    } else {
        ball.position.y = 1;
    }
}

// Réinitialiser la voiture
function resetCar() {
    // Positionner la voiture en face de la balle et des cages, tournée de 90° par rapport à la balle
    car.position.set(-20, 0, 0);
    carVelocity.set(0, 0, 0);
    carVerticalVelocity = 0;
    carIsOnGround = true;
    hasJumpedOnce = false;
    canDoubleJump = false;
    carRotation = Math.PI / 2; // Rotation de 90° (regarde vers le haut, direction positive Z)
    car.rotation.y = carRotation;
    
    // Revenir à la hauteur de référence
    car.position.y = carGroundY || car.position.y;
}

// Réinitialiser la voiture IA
function resetOpponentCar() {
    if (!opponentCar) return;
    
    // Positionner l'opponent de son côté (côté droit, x=20), à la même distance de la balle que le joueur
    opponentCar.position.set(20, 0, 0);
    opponentCarVelocity.set(0, 0, 0);
    opponentCarVerticalVelocity = 0;
    opponentCarIsOnGround = true;
    // Orientation opposée au joueur : -90° (-Math.PI / 2) vers le bas (axe Z-)
    opponentCarRotation = -Math.PI / 2;
    opponentCar.rotation.y = opponentCarRotation;
    opponentCar.position.y = opponentCarGroundY || opponentCar.position.y;
    opponentCarBoostAmount = 100;
}

// Mise à jour de la caméra
function updateCamera() {
    // Vérifier que car et ball existent
    if (!car || !ball) return;
    
    // Direction de la voiture (où elle regarde)
    const carDirection = new THREE.Vector3(
        Math.sin(carRotation),
        0,
        Math.cos(carRotation)
    );
    
    // Position de la caméra : derrière la voiture
    // On va dans la direction opposée à celle où la voiture regarde
    const cameraDistance = 12; // Distance derrière la voiture
    const cameraHeight = 6; // Hauteur de la caméra
    
    const cameraOffset = new THREE.Vector3(
        -carDirection.x * cameraDistance,
        cameraHeight,
        -carDirection.z * cameraDistance
    );
    
    const targetCameraPosition = car.position.clone().add(cameraOffset);
    
    // Lisser le mouvement de la caméra
    camera.position.lerp(targetCameraPosition, 0.15);
    
    // Calculer le point de focus : la voiture reste au centre, mais on ajuste légèrement vers la balle
    const ballDirection = new THREE.Vector3()
        .subVectors(ball.position, car.position);
    const distanceToBall = ballDirection.length();
    
    // Point devant la voiture (pour garder la voiture centrée)
    const lookAheadDistance = 15; // Distance devant la voiture où on regarde par défaut
    const forwardPoint = car.position.clone().add(
        carDirection.clone().multiplyScalar(lookAheadDistance)
    );
    
    // Ajustement subtil vers la balle (mais la voiture reste au centre)
    // Plus la balle est proche, plus on regarde légèrement vers elle
    const ballInfluence = Math.min(0.3, 20 / distanceToBall); // Influence limitée à 30%
    
    // Direction vers la balle depuis le point devant la voiture
    const toBall = new THREE.Vector3()
        .subVectors(ball.position, forwardPoint)
        .normalize();
    
    // Ajuster le point de focus : principalement devant la voiture, avec un léger biais vers la balle
    const focusPoint = forwardPoint.clone();
    
    // Ajouter un léger offset vers la balle (mais pas trop pour garder la voiture centrée)
    const ballOffset = toBall.clone().multiplyScalar(lookAheadDistance * ballInfluence);
    focusPoint.add(ballOffset);
    
    // Ajuster la hauteur du focus
    focusPoint.y = Math.max(1, ball.position.y * 0.2 + forwardPoint.y * 0.8);
    
    // La caméra regarde vers le point de focus (la voiture reste au centre de l'écran)
    camera.lookAt(focusPoint);
}

// Mise à jour des statistiques
function updateStats() {
    const speed = Math.round(carVelocity.length() * 50); // Conversion approximative en km/h
    const boost = Math.round(boostAmount);
    
    // Mettre à jour le menu
    const speedEl = document.getElementById('speed');
    const boostEl = document.getElementById('boost');
    if (speedEl) speedEl.textContent = speed;
    if (boostEl) boostEl.textContent = boost;
    
    // Mettre à jour le HUD
    const hudSpeedEl = document.getElementById('hud-speed');
    const hudBoostEl = document.getElementById('hud-boost');
    if (hudSpeedEl) hudSpeedEl.textContent = speed;
    if (hudBoostEl) hudBoostEl.textContent = boost;
    
    // Mettre à jour le score (format "JOUEUR - IA")
    updateScoreDisplay();
}

// Animation
function animate() {
    requestAnimationFrame(animate);

    if (isInGame) {
        // Mettre à jour le chrono de match (seulement en mode match)
        if (gameMode === 'match') {
            updateMatchTimer();
        }
        
        if (!isMatchOver) {
            updateCar();
            // Mettre à jour l'IA seulement en mode match
            if (gameMode === 'match' && opponentCar && opponentCar.visible) {
                updateOpponentCar();
            }
            updateBall();
            checkCollision();
            updateCamera();
            updateStats();
        }
    } else {
        // Mode menu : caméra cinématique simple autour de la voiture et du ballon
        updateMenuCamera();
    }

    renderer.render(scene, camera);
}

// Gérer le redimensionnement
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Caméra pour l'écran de menu (vue cinématique proche de la voiture et du ballon)
function updateMenuCamera() {
    if (!car || !ball) return;

    // Cibler une position entre la voiture et le ballon
    const focus = car.position.clone().lerp(ball.position, 0.3);

    // Faire une légère orbite autour de la voiture pour donner de la vie
    const t = Date.now() * 0.00025;
    const radius = 10;
    const height = 4;

    const camX = car.position.x + Math.cos(t) * radius;
    const camZ = car.position.z + Math.sin(t) * radius;
    const camY = focus.y + height;

    const targetCamPos = new THREE.Vector3(camX, camY, camZ);
    camera.position.lerp(targetCamPos, 0.05);

    // Regarder légèrement au-dessus du centre de la voiture
    const lookAtTarget = focus.clone();
    lookAtTarget.y += 1.2;
    camera.lookAt(lookAtTarget);
}

// Fonction pour revenir à la landing page
function returnToLanding() {
    const landing = document.getElementById('landing');
    const menu = document.getElementById('menu');
    
    if (!landing) return;
    
    // Arrêter le jeu
    isInGame = false;
    document.body.classList.add('landing-active');
    
    // Arrêter les sons du moteur
    if (boostOscillator) {
        stopBoostSound();
    }
    if (engineOscillator) {
        engineOscillator.stop();
        engineOscillator = null;
    }
    
    // Réinitialiser la voiture et la balle
    resetCar();
    resetOpponentCar();
    resetBall();
    
    // Réinitialiser le chrono et l'état de match
    matchStartTime = null;
    isMatchOver = false;
    gameMode = 'match'; // Réinitialiser le mode
    updateMatchTimerDisplay(matchDurationMs);
    
    // Réafficher l'IA et le chrono pour le prochain match
    if (opponentCar) {
        opponentCar.visible = true;
    }
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
        timerEl.style.display = 'block';
    }
    
    // Afficher la landing page
    landing.style.display = 'flex';
    landing.classList.remove('hidden');
    
    // Redémarrer l'animation de prévisualisation si elle n'est pas déjà en cours
    if (!carPreviewAnimationId && carPreviewScene) {
        animateCarPreview();
    } else if (!carPreviewScene) {
        // Réinitialiser la prévisualisation si elle n'existe pas
        initCarPreview();
    }
    
    // Fermer le menu
    if (menu) {
        menu.classList.remove('open');
        document.body.classList.remove('menu-open');
    }
}

// Gestion du menu
function setupMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const backToLandingBtn = document.getElementById('backToLandingBtn');
    const menu = document.getElementById('menu');
    
    if (!menuBtn || !closeMenuBtn || !menu) {
        console.warn('Éléments du menu non trouvés');
        return;
    }
    
    function openMenu() {
        menu.classList.add('open');
        document.body.classList.add('menu-open');
    }
    
    function closeMenu() {
        menu.classList.remove('open');
        document.body.classList.remove('menu-open');
    }
    
    menuBtn.addEventListener('click', openMenu);
    closeMenuBtn.addEventListener('click', closeMenu);
    
    // Bouton retour à l'accueil
    if (backToLandingBtn) {
        backToLandingBtn.addEventListener('click', () => {
            closeMenu();
            returnToLanding();
        });
    }
    
    // Fermer le menu avec ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (menu.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        }
    });
    
    // Fermer le menu en cliquant à l'extérieur
    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            closeMenu();
        }
    });
}

// Démarrer le jeu
init();
setupMenu();

// Initialiser la prévisualisation 3D de la voiture
function initCarPreview() {
    const canvas = document.getElementById('carPreviewCanvas');
    if (!canvas) return;
    
    // Créer la scène
    carPreviewScene = new THREE.Scene();
    carPreviewScene.background = new THREE.Color(0x1a1a1a);
    
    // Créer la caméra
    carPreviewCamera = new THREE.PerspectiveCamera(
        50,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    carPreviewCamera.position.set(0, 2, 5);
    carPreviewCamera.lookAt(0, 0, 0);
    
    // Créer le renderer
    carPreviewRenderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    carPreviewRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    carPreviewRenderer.setPixelRatio(window.devicePixelRatio);
    
    // Éclairage
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    carPreviewScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    carPreviewScene.add(directionalLight);
    
    // Charger le modèle de voiture
    loadCarPreviewModel();
    
    // Démarrer l'animation
    animateCarPreview();
}

// Charger le modèle de voiture pour la prévisualisation
function loadCarPreviewModel() {
    if (!carPreviewScene) return;
    
    // Supprimer l'ancien modèle s'il existe
    if (carPreviewCar) {
        carPreviewScene.remove(carPreviewCar);
        carPreviewCar = null;
    }
    
    const loader = new THREE.GLTFLoader();
    const modelPath = selectedCarModel === 'octane' 
        ? 'model/octane/scene.gltf' 
        : 'model/fennnec/scene.gltf';
    
    loader.load(
        modelPath,
        function(gltf) {
            const model = gltf.scene;
            
            // Activer les ombres
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Ajuster l'échelle
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDimension = Math.max(size.x, size.y, size.z);
            
            if (maxDimension > 5) {
                const scale = 3 / maxDimension;
                model.scale.set(scale, scale, scale);
                box.setFromObject(model);
            }
            
            // Rotation pour l'affichage
            model.rotation.y = -Math.PI / 2;
            
            // Centrer le modèle
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            
            carPreviewCar = new THREE.Group();
            carPreviewCar.add(model);
            carPreviewScene.add(carPreviewCar);
            
            // Mettre à jour le nom
            updateCarName();
        },
        undefined,
        function(error) {
            console.error('Erreur lors du chargement du modèle pour la prévisualisation:', error);
        }
    );
}

// Animer la prévisualisation de la voiture
function animateCarPreview() {
    if (!carPreviewRenderer || !carPreviewScene || !carPreviewCamera) return;
    
    carPreviewAnimationId = requestAnimationFrame(animateCarPreview);
    
    // Rotation lente de la voiture
    if (carPreviewCar) {
        carPreviewCar.rotation.y += 0.01;
    }
    
    carPreviewRenderer.render(carPreviewScene, carPreviewCamera);
}

// Mettre à jour le nom de la voiture affiché
function updateCarName() {
    const carNameEl = document.getElementById('carName');
    if (carNameEl) {
        carNameEl.textContent = selectedCarModel === 'octane' ? 'OCTANE' : 'FENNEC';
    }
}

// Changer de modèle de voiture
function switchCarModel() {
    selectedCarModel = selectedCarModel === 'fennec' ? 'octane' : 'fennec';
    loadCarPreviewModel();
    savePreferences();
}

// Fonction pour démarrer un match (avec IA et chrono)
function startMatch() {
    // Recharger le modèle de voiture avec le modèle sélectionné
    if (car) {
        loadCarModel();
    }
    
    // Démarrer l'audio si pas encore fait
    if (audioContext) {
        if (audioContext.state !== 'running') {
            audioContext.resume().then(() => {
                if (!engineOscillator) {
                    initEngineSound();
                }
                audioStarted = true;
            });
        } else if (!engineOscillator) {
            initEngineSound();
            audioStarted = true;
        }
    }
    
    // Démarrer la musique de fond
    startBackgroundMusic();
    
    // Mode match
    gameMode = 'match';
    
    // Réinitialiser les scores
    playerScore = 0;
    opponentScore = 0;
    goalsScored = 0;
    updateScoreDisplay();
    
    // Initialiser le chrono de match (5 minutes)
    matchStartTime = Date.now();
    isMatchOver = false;
    updateMatchTimerDisplay(matchDurationMs);
    
    // Afficher le chrono
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
        timerEl.style.display = 'block';
    }
    
    // Afficher l'IA
    if (opponentCar) {
        opponentCar.visible = true;
    }
    
    // Réinitialiser la voiture et la balle avant de commencer
    resetCar();
    resetOpponentCar();
    resetBall();
    
    // Réinitialiser la caméra
    setTimeout(() => {
        if (car) {
            const carDirection = new THREE.Vector3(
                Math.sin(carRotation),
                0,
                Math.cos(carRotation)
            );
            const cameraDistance = 12;
            const cameraHeight = 6;
            const cameraOffset = new THREE.Vector3(
                -carDirection.x * cameraDistance,
                cameraHeight,
                -carDirection.z * cameraDistance
            );
            camera.position.copy(car.position.clone().add(cameraOffset));
            
            const lookAheadPoint = car.position.clone().add(
                carDirection.clone().multiplyScalar(15)
            );
            lookAheadPoint.y = Math.max(1, lookAheadPoint.y);
            camera.lookAt(lookAheadPoint);
        }
    }, 100);
    
    // Lancer la partie
    isInGame = true;
    document.body.classList.remove('landing-active');

    // Masquer la landing
    const landing = document.getElementById('landing');
    if (landing) {
        landing.classList.add('hidden');
        setTimeout(() => {
            landing.style.display = 'none';
            if (carPreviewAnimationId) {
                cancelAnimationFrame(carPreviewAnimationId);
                carPreviewAnimationId = null;
            }
        }, 400);
    }
}

// Fonction pour démarrer le freeplay (sans IA, sans chrono)
function startFreeplay() {
    // Recharger le modèle de voiture avec le modèle sélectionné
    if (car) {
        loadCarModel();
    }
    
    // Démarrer l'audio si pas encore fait
    if (audioContext) {
        if (audioContext.state !== 'running') {
            audioContext.resume().then(() => {
                if (!engineOscillator) {
                    initEngineSound();
                }
                audioStarted = true;
            });
        } else if (!engineOscillator) {
            initEngineSound();
            audioStarted = true;
        }
    }
    
    // Démarrer la musique de fond
    startBackgroundMusic();
    
    // Mode freeplay
    gameMode = 'freeplay';
    
    // Réinitialiser les scores
    playerScore = 0;
    opponentScore = 0;
    goalsScored = 0;
    updateScoreDisplay();
    
    // Pas de chrono en freeplay
    matchStartTime = null;
    isMatchOver = false;
    
    // Cacher le chrono
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) {
        timerEl.style.display = 'none';
    }
    
    // Cacher l'IA
    if (opponentCar) {
        opponentCar.visible = false;
    }
    
    // Réinitialiser la voiture et la balle avant de commencer
    resetCar();
    resetBall();
    
    // Réinitialiser la caméra
    setTimeout(() => {
        if (car) {
            const carDirection = new THREE.Vector3(
                Math.sin(carRotation),
                0,
                Math.cos(carRotation)
            );
            const cameraDistance = 12;
            const cameraHeight = 6;
            const cameraOffset = new THREE.Vector3(
                -carDirection.x * cameraDistance,
                cameraHeight,
                -carDirection.z * cameraDistance
            );
            camera.position.copy(car.position.clone().add(cameraOffset));
            
            const lookAheadPoint = car.position.clone().add(
                carDirection.clone().multiplyScalar(15)
            );
            lookAheadPoint.y = Math.max(1, lookAheadPoint.y);
            camera.lookAt(lookAheadPoint);
        }
    }, 100);
    
    // Lancer la partie
    isInGame = true;
    document.body.classList.remove('landing-active');

    // Masquer la landing
    const landing = document.getElementById('landing');
    if (landing) {
        landing.classList.add('hidden');
        setTimeout(() => {
            landing.style.display = 'none';
            if (carPreviewAnimationId) {
                cancelAnimationFrame(carPreviewAnimationId);
                carPreviewAnimationId = null;
            }
        }, 400);
    }
}

// Landing page / mode menu principal
function setupLanding() {
    const landing = document.getElementById('landing');
    const matchBtn = document.getElementById('matchBtn');
    const freeplayBtn = document.getElementById('freeplayBtn');
    const carPrevBtn = document.getElementById('carPrevBtn');
    const carNextBtn = document.getElementById('carNextBtn');

    if (!landing) return;

    // Démarrer en mode menu
    isInGame = false;
    document.body.classList.add('landing-active');
    
    // Initialiser la prévisualisation 3D
    initCarPreview();
    
    // Gérer les boutons de navigation de voiture
    if (carPrevBtn) {
        carPrevBtn.addEventListener('click', () => switchCarModel());
    }
    if (carNextBtn) {
        carNextBtn.addEventListener('click', () => switchCarModel());
    }

    // Gérer le bouton MATCH
    if (matchBtn) {
        matchBtn.addEventListener('click', startMatch);
    }
    
    // Gérer le bouton FREEPLAY
    if (freeplayBtn) {
        freeplayBtn.addEventListener('click', startFreeplay);
    }
    
    // Gérer le redimensionnement du canvas de prévisualisation
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('carPreviewCanvas');
        if (canvas && carPreviewRenderer && carPreviewCamera) {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            carPreviewCamera.aspect = width / height;
            carPreviewCamera.updateProjectionMatrix();
            carPreviewRenderer.setSize(width, height);
        }
    });
    
    // Démarrer la musique au premier clic ou touche sur la landing page
    let musicStartedOnLanding = false;
    const startMusicOnLanding = () => {
        if (musicStartedOnLanding) return;
        musicStartedOnLanding = true;
        startBackgroundMusic();
    };
    
    // Écouter les clics et touches sur la landing page
    landing.addEventListener('click', startMusicOnLanding, { once: true });
    landing.addEventListener('touchstart', startMusicOnLanding, { once: true });
    document.addEventListener('keydown', (e) => {
        // Démarrer la musique au premier appui de touche si on est sur la landing
        if (document.body.classList.contains('landing-active')) {
            startMusicOnLanding();
        }
    }, { once: true });
}

