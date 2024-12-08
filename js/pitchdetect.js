/*
The MIT License (MIT)
(C) 2014 Chris Wilson
Modified for on-demand pitch updates and demo audio playback.
*/

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var mediaStreamSource = null;
var isPlaying = false;
var isLiveInput = false;
var buflen = 2048;
var buf = new Float32Array(buflen);
var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

var detectorElem, pitchElem, noteElem, detuneElem, detuneAmount;

window.onload = function() {
    audioContext = new AudioContext();

    detectorElem = document.getElementById("detector");
    pitchElem = document.getElementById("pitch");
    noteElem = document.getElementById("note");
    detuneElem = document.getElementById("detune");
    detuneAmount = document.getElementById("detune_amt");

    detectorElem.ondragenter = function () {
        this.classList.add("droptarget"); 
        return false; 
    };
    detectorElem.ondragleave = function () {
        this.classList.remove("droptarget"); 
        return false; 
    };
    detectorElem.ondrop = function (e) {
        this.classList.remove("droptarget");
        e.preventDefault();
        theBuffer = null;

        var reader = new FileReader();
        reader.onload = function (event) {
            audioContext.decodeAudioData(event.target.result, function(buffer) {
                theBuffer = buffer;
            }, function(){alert("error loading!");});
        };
        reader.onerror = function (event) {
            alert("Error: " + reader.error );
        };
        reader.readAsArrayBuffer(e.dataTransfer.files[0]);
        return false;
    };

    fetch('nocoj.ogg')
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error, status = ${response.status}`);
            }
            return response.arrayBuffer();
        }).then((buffer) => audioContext.decodeAudioData(buffer)).then((decodedData) => {
            theBuffer = decodedData;
        });
};

function startPitchDetect() {
    audioContext = new AudioContext();
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        mediaStreamSource.connect(analyser);
        isLiveInput = true;
    }).catch((err) => {
        console.error(`${err.name}: ${err.message}`);
        alert('Stream generation failed.');
    });
}

function noteFromPitch(frequency) {
    var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note))/Math.log(2));
}

function autoCorrelate(buf, sampleRate) {
    var SIZE = buf.length;
    var rms = 0;

    for (var i=0;i<SIZE;i++) {
        var val = buf[i];
        rms += val*val;
    }
    rms = Math.sqrt(rms/SIZE);
    if (rms<0.01) return -1;

    var r1=0, r2=SIZE-1, thres=0.2;
    for (var i=0; i<SIZE/2; i++)
        if (Math.abs(buf[i])<thres) { r1=i; break; }
    for (var i=1; i<SIZE/2; i++)
        if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

    buf = buf.slice(r1,r2);
    SIZE = buf.length;

    var c = new Array(SIZE).fill(0);
    for (var i=0; i<SIZE; i++)
        for (var j=0; j<SIZE-i; j++)
            c[i] = c[i] + buf[j]*buf[j+i];

    var d=0; 
    while (c[d]>c[d+1]) d++;
    var maxval=-1, maxpos=-1;
    for (var i=d; i<SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    var T0 = maxpos;

    var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
    var a = (x1 + x3 - 2*x2)/2;
    var b = (x3 - x1)/2;
    if (a) T0 = T0 - b/(2*a);

    return sampleRate/T0;
}

function updatePitchOnce() {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buf);
    var ac = autoCorrelate(buf, audioContext.sampleRate);

    if (ac == -1) {
        detectorElem.className = "vague";
        pitchElem.innerText = "--";
        noteElem.innerText = "-";
        detuneElem.className = "";
        detuneAmount.innerText = "--";
    } else {
        detectorElem.className = "confident";
        var pitch = ac;
        pitchElem.innerText = Math.round(pitch);
        var note = noteFromPitch(pitch);
        noteElem.innerHTML = noteStrings[note % 12];
        var detune = centsOffFromPitch(pitch, note);
        if (detune == 0) {
            detuneElem.className = "";
            detuneAmount.innerHTML = "--";
        } else {
            if (detune < 0)
                detuneElem.className = "flat";
            else
                detuneElem.className = "sharp";
            detuneAmount.innerHTML = Math.abs(detune);
        }
    }
}

function togglePlayback() {
    if (isPlaying) {
        sourceNode.stop(0);
        sourceNode = null;
        analyser = null;
        isPlaying = false;
        isLiveInput = false;
    } else {
        if (!theBuffer) {
            alert("Audio buffer not loaded yet!");
            return;
        }
        isLiveInput = false;
        audioContext = new AudioContext();
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = theBuffer;
        sourceNode.loop = true;

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
        sourceNode.start(0);
        isPlaying = true;
    }
}
