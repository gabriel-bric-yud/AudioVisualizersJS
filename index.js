//////////////////////////////////////// Global Contants ////////////////////////////////////////

const btn1 = document.querySelector('#btn1');
const canvas1 = document.querySelector('#vis1');
const canvas2 = document.querySelector('#vis2');
const canvas3 = document.querySelector('#vis3');
const visCtx1 = canvas1.getContext("2d");
const visCtx2 = canvas2.getContext("2d");
const visCtx3 = canvas3.getContext("2d");
const volumeControl = document.querySelector("#volume");
const trackOption = document.querySelector("#tracks")

//////////////////////////////////////// Global Variables ////////////////////////////////////////

let playing = false;
let freqAnimationLoop;
let waveAnimationLoop;
let spectrogramAnimationLoop;
let frameLength
let freqHeight

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
console.log(audioCtx.sampleRate);
let gainNode
let analyser
let bufferLength 
let dataFreqArray 
let dataWaveArray
let dataSpectrogramFreqArray

let currentX = 0
let track;
let audioElem;


//////////////////////////////////////// Audion Context Functions ////////////////////////////////////////


async function createAudioContext() {
  playing = false;
  currentX = 0;
  visCtx1.fillStyle = "rgba(0, 0, 0)";
  visCtx1.fillRect(0, 0, 360, 250);
  visCtx2.fillStyle = "rgba(0, 0, 0)";
  visCtx2.fillRect(0, 0, 360, 250);
  visCtx3.fillStyle = "rgba(0, 0, 0)"; 
  visCtx3.fillRect(0, 0, 360, 250);
  await audioCtx.suspend().then(() =>  audioCtx.close()).then(() => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (track != null) {
      track.disconnect();
      analyser.disconnect()
      gainNode.disconnect()
    }
    gainNode = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; //Samples at 60fps for 48000 sample rate
    bufferLength = analyser.frequencyBinCount;
    dataFreqArray = new Float32Array(bufferLength);
    dataWaveArray = new Float32Array(bufferLength);
    dataSpectrogramFreqArray = new Float32Array(bufferLength);
  })
}


function chooseTrack(trackTxt) {
  createAudioContext().then(() => {
    audioElem = document.querySelector(`#${trackTxt}`);

    track = audioCtx.createMediaElementSource(audioElem);
    track.connect(analyser).connect(gainNode).connect(audioCtx.destination);
    console.log(audioElem)
    console.log(audioElem.duration)
    frameLength = 360 / ((audioElem.duration * 1000)/ 3.2) ; //frameLength = 360 / (audioElem.duration * 240)
    freqHeight = 250 / bufferLength;
    audioElem.addEventListener("ended",() => {
      playing = false;
      currentX = 0;
    },false);
  })

}


function getFrequency(index) {
  const nyquist = audioCtx.sampleRate / 2;
  return index * nyquist / bufferLength;
}


//////////////////////////////////////// Event Listeners ////////////////////////////////////////


trackOption.addEventListener("change", (e) => {
  chooseTrack(e.target.value)
})


btn1.addEventListener("click", (e) => {
  if (audioElem == null) {
    chooseTrack(trackOption.value) 
  }

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
    playing = true;
    drawFreq(visCtx1);
    drawWave(visCtx2)
    drawSpectrogramAnimationFrame(visCtx3)
    //drawSpectrogram(visCtx3)

  }

  // Play or pause track depending on state
  if (playing == false) {
    audioElem.play();
    playing = true;
    drawFreq(visCtx1);
    drawWave(visCtx2)
    drawSpectrogramAnimationFrame(visCtx3)

    //drawSpectrogram(visCtx3)
  } 
  else if (playing == true) {
    audioElem.pause();
    playing = false;
  }
}, false)




volumeControl.addEventListener("input", () => {
    gainNode.gain.value = volumeControl.value;
    document.querySelector("#volumeTxt").innerHTML = volumeControl.value
},false);



//////////////////////////////////////// Draw Functions ////////////////////////////////////////

function drawFreq(canvasCtx) {
  canvasCtx = visCtx1
  freqAnimationLoop = window.requestAnimationFrame(drawFreq);

  //Get data
  analyser.getFloatFrequencyData(dataFreqArray);

  canvasCtx.fillStyle = "rgb(0 0 0)";
  canvasCtx.fillRect(0, 0, 360, 250);

  const barWidth = (360 / bufferLength) * 2.5;
  let posX = 0;
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataFreqArray[i] + 200) * 2.3;
    canvasCtx.fillStyle = `rgb(50 50 ${Math.floor(barHeight + 100)})`;
    canvasCtx.fillRect(
      posX,
      250 - barHeight / 2,
      barWidth,
      barHeight / 2,
    );
    posX += barWidth + 1;
  }

  if (!playing) {
    canvasCtx.fillStyle = "rgb(0 0 0)";
    canvasCtx.fillRect(0, 0, 360, 250);
    window.cancelAnimationFrame(freqAnimationLoop)
  }


}


function drawWave(canvasCtx) {
  canvasCtx = visCtx2
  waveAnimationLoop = window.requestAnimationFrame(drawWave);

  analyser.getFloatTimeDomainData(dataWaveArray);

  canvasCtx.fillStyle = "rgba(0, 0, 0, .3)"; //.001
  canvasCtx.fillRect(0, 0, 360, 250);
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = `rgb(${Math.floor(Math.random() * 225) + 20},
  ${Math.floor(Math.random() * 225) + 20}, ${Math.floor(Math.random() * 225) + 20})`
  canvasCtx.beginPath();

  const sliceWidth = (360 * 1.0) / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataWaveArray[i] * 50.0; //200
    const y = 170 / 2 + v; //250/2
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  canvasCtx.lineTo(360, 250/ 2);
  canvasCtx.stroke();

  if (!playing) {
    canvasCtx.fillStyle = "rgb(0 0 0)";
    canvasCtx.fillRect(0, 0, 360, 250);
    window.cancelAnimationFrame(waveAnimationLoop)
  }

}


function drawSpectrogramAnimationFrame(canvasCtx) {

  canvasCtx = visCtx3
  canvasCtx.fillStyle = "rgba(0, 0, 0, .001)";
  canvasCtx.fillRect(0, 0, 360, 250);

  spectrogramAnimationLoop = window.requestAnimationFrame(drawSpectrogramAnimationFrame);

  analyser.getFloatFrequencyData(dataSpectrogramFreqArray);
  let currentY = 0;

  for (let i = bufferLength; i > 0; i--) {
    let yellowSpectrum = 255
    let redSpectrum = 190

    if (dataSpectrogramFreqArray[i] <= -25 ) { 
      yellowSpectrum += ((dataSpectrogramFreqArray[i]) * 0.8);
      if (yellowSpectrum < 0)  {
        yellowSpectrum = 0
        redSpectrum = 0
      }
    }
    //console.log(`Freq: ${i} - yellow spect: ${yellowSpectrum} | ${dataSpectrogramFreqArray[i]}`)
    canvasCtx.fillStyle = `rgb(${redSpectrum} ${yellowSpectrum} 0)`;

    canvasCtx.fillRect(
      currentX,
      currentY,
      frameLength,
      freqHeight,
    );
    currentY += freqHeight;

  }
  currentX += frameLength;

  if (!playing) {
    console.log(playing)
    window.cancelAnimationFrame(spectrogramAnimationLoop)
  }
  

}



function drawSpectrogram(canvasCtx) {

  canvasCtx = visCtx3
  //canvasCtx.fillStyle = "rgba(0, 0, 0, .01)";
  //canvasCtx.fillRect(0, 0, 360, 250);
  
  spectrogramAnimationLoop = setInterval(() => {
    analyser.getFloatFrequencyData(dataSpectrogramFreqArray);
    let currentY = 0;

    for (let i = bufferLength; i > 0; i--) {
      let yellowSpectrum = 255 + dataSpectrogramFreqArray[i];
      let redSpectrum = 255
      if (yellowSpectrum <= 150) { //0
        if (yellowSpectrum >= 0) {
          redSpectrum -= yellowSpectrum;

        }
        else if (yellowSpectrum >= -255) {
          redSpectrum += yellowSpectrum;
        }
        else {
          redSpectrum = 0
        }
        yellowSpectrum = 0
      };
      
      canvasCtx.fillStyle = `rgb(${redSpectrum} ${yellowSpectrum} 0)`;
      canvasCtx.fillRect(
        currentX,
        currentY,
        frameLength,
        freqHeight,
      );
      currentY += freqHeight;

      if (!playing) {
        clearInterval(spectrogramAnimationLoop)
        break;
      }
    }
    currentX += frameLength;

    if (!playing) {
      clearInterval(spectrogramAnimationLoop)
    }
  }, 20)

}