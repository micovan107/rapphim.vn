// WebRTC Screen Sharing Implementation

let localStream = null;
let peerConnections = {};
let roomRef = null;
let screenSharingActive = false;

// Initialize WebRTC for screen sharing
async function initScreenSharing(roomId) {
    roomRef = database.ref(`rooms/${roomId}`);
    
    // Listen for new participants to establish connections
    database.ref(`rooms/${roomId}/participants`).on('child_added', async (snapshot) => {
        const participant = snapshot.val();
        const participantId = snapshot.key;
        
        // Don't connect to yourself
        if (participantId !== currentUser.uid && !peerConnections[participantId]) {
            await createPeerConnection(participantId);
        }
    });
    
    // Listen for participants leaving
    database.ref(`rooms/${roomId}/participants`).on('child_removed', (snapshot) => {
        const participantId = snapshot.key;
        if (peerConnections[participantId]) {
            peerConnections[participantId].close();
            delete peerConnections[participantId];
        }
    });
    
    // Listen for signaling messages
    database.ref(`rooms/${roomId}/rtcSignaling`).on('child_added', async (snapshot) => {
        const signal = snapshot.val();
        
        // Ignore messages from yourself
        if (signal.from === currentUser.uid) return;
        
        // Handle offer
        if (signal.type === 'offer' && signal.to === currentUser.uid) {
            await handleOffer(signal);
        }
        
        // Handle answer
        if (signal.type === 'answer' && signal.to === currentUser.uid) {
            await handleAnswer(signal);
        }
        
        // Handle ICE candidate
        if (signal.type === 'ice-candidate' && signal.to === currentUser.uid) {
            await handleIceCandidate(signal);
        }
        
        // Remove processed signaling message
        snapshot.ref.remove();
    });
}

// Start screen sharing
async function startScreenSharing() {
    try {
        // Request screen sharing stream
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always"
            },
            audio: false
        });
        
        // Save local stream reference
        localStream = stream;
        screenSharingActive = true;
        
        // Display local stream in a preview element
        const screenPreview = document.getElementById('screenPreview');
        if (screenPreview) {
            screenPreview.srcObject = stream;
        }
        
        // Add stream to all existing peer connections
        Object.values(peerConnections).forEach(pc => {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        });
        
        // Create new connections for participants without connections
        const participantsSnapshot = await database.ref(`rooms/${roomId}/participants`).once('value');
        participantsSnapshot.forEach(async (snapshot) => {
            const participantId = snapshot.key;
            if (participantId !== currentUser.uid && !peerConnections[participantId]) {
                await createPeerConnection(participantId);
            }
        });
        
        // Listen for the end of screen sharing
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            stopScreenSharing();
        });
        
        // Update UI to show screen sharing is active
        updateScreenSharingUI(true);
        
        // Send system message to room chat
        await database.ref(`roomChats/${roomId}`).push({
            type: 'system',
            message: `${currentUser.displayName || 'Khách'} đã bắt đầu chia sẻ màn hình.`,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        return true;
    } catch (error) {
        console.error('Error starting screen sharing:', error);
        showError(`Lỗi khi chia sẻ màn hình: ${error.message}`);
        return false;
    }
}

// Stop screen sharing
function stopScreenSharing() {
    if (localStream) {
        // Stop all tracks
        localStream.getTracks().forEach(track => track.stop());
        
        // Remove tracks from all peer connections
        Object.values(peerConnections).forEach(pc => {
            pc.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'video') {
                    pc.removeTrack(sender);
                }
            });
        });
        
        localStream = null;
        screenSharingActive = false;
        
        // Update UI
        updateScreenSharingUI(false);
        
        // Send system message to room chat
        database.ref(`roomChats/${roomId}`).push({
            type: 'system',
            message: `${currentUser.displayName || 'Khách'} đã dừng chia sẻ màn hình.`,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

// Create a peer connection with a specific participant
async function createPeerConnection(participantId) {
    // ICE servers configuration (STUN/TURN servers)
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };
    
    // Create new peer connection
    const pc = new RTCPeerConnection(configuration);
    peerConnections[participantId] = pc;
    
    // Add local stream tracks to the connection if available
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = event => {
        if (event.candidate) {
            // Send ICE candidate to the peer
            database.ref(`rooms/${roomId}/rtcSignaling`).push({
                type: 'ice-candidate',
                from: currentUser.uid,
                to: participantId,
                candidate: event.candidate.toJSON()
            });
        }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${participantId}: ${pc.connectionState}`);
    };
    
    // Handle incoming tracks (when someone shares their screen)
    pc.ontrack = event => {
        // Display the remote stream
        const remoteVideo = document.getElementById('remoteScreenShare');
        if (remoteVideo && event.streams && event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            
            // Show the remote screen container
            const remoteScreenContainer = document.getElementById('remoteScreenContainer');
            if (remoteScreenContainer) {
                remoteScreenContainer.style.display = 'block';
            }
        }
    };
    
    // If we're the one sharing, create and send an offer
    if (screenSharingActive) {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            // Send the offer to the peer
            await database.ref(`rooms/${roomId}/rtcSignaling`).push({
                type: 'offer',
                from: currentUser.uid,
                to: participantId,
                sdp: pc.localDescription.toJSON()
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }
    
    return pc;
}

// Handle an incoming WebRTC offer
async function handleOffer(signal) {
    try {
        // Create peer connection if it doesn't exist
        if (!peerConnections[signal.from]) {
            await createPeerConnection(signal.from);
        }
        
        const pc = peerConnections[signal.from];
        
        // Set remote description from the offer
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send answer back to the peer
        await database.ref(`rooms/${roomId}/rtcSignaling`).push({
            type: 'answer',
            from: currentUser.uid,
            to: signal.from,
            sdp: pc.localDescription.toJSON()
        });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

// Handle an incoming WebRTC answer
async function handleAnswer(signal) {
    try {
        const pc = peerConnections[signal.from];
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
}

// Handle an incoming ICE candidate
async function handleIceCandidate(signal) {
    try {
        const pc = peerConnections[signal.from];
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
    }
}

// Update UI elements based on screen sharing state
function updateScreenSharingUI(isSharing) {
    const startScreenShareBtn = document.getElementById('startScreenShareBtn');
    const stopScreenShareBtn = document.getElementById('stopScreenShareBtn');
    
    if (startScreenShareBtn && stopScreenShareBtn) {
        if (isSharing) {
            startScreenShareBtn.style.display = 'none';
            stopScreenShareBtn.style.display = 'inline-block';
        } else {
            startScreenShareBtn.style.display = 'inline-block';
            stopScreenShareBtn.style.display = 'none';
        }
    }
}

// Check if browser supports screen sharing
function isScreenSharingSupported() {
    return navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices;
}

// Clean up WebRTC connections when leaving the room
function cleanupScreenSharing() {
    // Stop local stream if active
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Close all peer connections
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    
    // Remove all listeners
    if (roomRef) {
        database.ref(`rooms/${roomId}/participants`).off();
        database.ref(`rooms/${roomId}/rtcSignaling`).off();
    }
    
    screenSharingActive = false;
}