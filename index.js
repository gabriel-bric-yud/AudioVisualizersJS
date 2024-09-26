const box1 = document.querySelector('#box1');
const box2 = document.querySelector('#box2');
const canvas1 = document.querySelector('#vis1');
const canvas2 = document.querySelector('#vis2');
const canvas3 = document.querySelector('#vis3');
const visCtx1 = canvas1.getContext("2d");
const visCtx2 = canvas2.getContext("2d");
const visCtx3 = canvas3.getContext("2d");
const volumeControl = document.querySelector("#volume");
const trackOption = document.querySelector("#tracks")
let playing = false;
let freqAnimationLoop;
let waveAnimationLoop;
let spectogramAnimationLoop;
let frameLength
let freqHeight

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let gainNode
let analyser
let bufferLength 
let dataFreqArray 
let dataWaveArray
let dataSpectogramFreqArray
let dataSpectogramWaveArray

let currentX = 0
let track;
let audioElem;


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
    gainNode = audioCtx.createGain();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; //256
    bufferLength = analyser.frequencyBinCount;
    dataFreqArray = new Float32Array(bufferLength);
    dataWaveArray = new Float32Array(bufferLength);
    dataSpectogramFreqArray = new Float32Array(bufferLength);
    dataSpectogramWaveArray = new Float32Array(bufferLength);
  })
}


function chooseTrack(trackTxt) {
  createAudioContext().then(() => {
    audioElem = document.querySelector(`#${trackTxt}`);
    track = audioCtx.createMediaElementSource(audioElem);
    track.connect(analyser).connect(gainNode).connect(audioCtx.destination);
    frameLength = 360 / ((audioElem.duration * 1000)/ 3.2) ; //17
    freqHeight = 250 / bufferLength;
    audioElem.addEventListener("ended",() => {
      playing = false;
      currentX = 0;
    },false);
  })

}

chooseTrack("danceTrack") 

trackOption.addEventListener("change", (e) => {
  chooseTrack(e.target.value)
})




box1.addEventListener("click", (e) => {

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
    playing = true;
    drawFreq(visCtx1);
    drawWave(visCtx2)
    drawSpectogramAnimationFrame(visCtx3)
    //drawSpectogram(visCtx3)

  }

  // Play or pause track depending on state
  if (playing == false) {
    audioElem.play();
    playing = true;
    drawFreq(visCtx1);
    drawWave(visCtx2)
    drawSpectogramAnimationFrame(visCtx3)

    //drawSpectogram(visCtx3)
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


function getFrequency(index) {
  const nyquist = audioCtx.sampleRate / 2;
  return index * nyquist / bufferLength;
}



function drawFreq(canvasCtx) {
  //Schedule next redraw
  canvasCtx = visCtx1
  freqAnimationLoop = window.requestAnimationFrame(drawFreq);



  //Get spectrum data
  analyser.getFloatFrequencyData(dataFreqArray);

  //Draw black background
  canvasCtx.fillStyle = "rgb(0 0 0)";
  //canvasCtx.fillStyle = "rgba(0, 0, 0, .01)";
  canvasCtx.fillRect(0, 0, 360, 250);

  //Draw spectrum
  const barWidth = (360 / bufferLength) * 2.5;
  let posX = 0;
  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataFreqArray[i] + 200) * 2.3;
    //const barHeight = (dataFreqArray[i] + 140) * 3.5;
    canvasCtx.fillStyle = `rgb(50 50 ${Math.floor(barHeight + 100)})`;
    //canvasCtx.fillStyle = `rgb(${Math.floor(Math.random() * 225) + 20},
    //${Math.floor(Math.random() * 225) + 20}, ${Math.floor(Math.random() * 225) + 20})`
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
  //Schedule next redraw
  canvasCtx = visCtx2
  waveAnimationLoop = window.requestAnimationFrame(drawWave);

  analyser.getFloatTimeDomainData(dataWaveArray);

  canvasCtx.fillStyle = "rgba(0, 0, 0, .06)"; //.001
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
    //if (i == 200) {
      //console.log(dataWaveArray[i])
      //console.log(`i is ${i} and v is ${v} || x is ${x} and y is ${y}`)
    //}


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

// yellow rgb(255, 255, 0);
// dark red rgb(100, 0, 0);




function drawSpectogramAnimationFrame(canvasCtx) {
  //Schedule next redraw
  canvasCtx = visCtx3
  //Draw black background
  //canvasCtx.fillStyle = "rgb(0 0 0)";
  canvasCtx.fillStyle = "rgba(0, 0, 0, .001)";
  canvasCtx.fillRect(0, 0, 360, 250);
  spectogramAnimationLoop = window.requestAnimationFrame(drawSpectogramAnimationFrame);
  analyser.getFloatFrequencyData(dataSpectogramFreqArray);
  let currentY = 0;

  for (let i = bufferLength; i > 0; i--) {
    let yellowSpectrum = 255
    let redSpectrum = 255

    if (dataSpectogramFreqArray[i] <= -90 ) { 
      yellowSpectrum += (dataSpectogramFreqArray[i]);
      if (yellowSpectrum < 50)  {
        yellowSpectrum = 0
        redSpectrum = 0
      }
    }
    //console.log(`Freq: ${i} - yellow spect: ${yellowSpectrum} | ${dataSpectogramFreqArray[i]}`)

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
    //canvasCtx.fillStyle = "rgb(0 0 0)";
    //canvasCtx.fillRect(0, 0, 360, 250);
    window.cancelAnimationFrame(spectogramAnimationLoop)
  }
  

}



function drawSpectogram(canvasCtx) {
  //Schedule next redraw
  canvasCtx = visCtx3
  //Draw black background
  canvasCtx.fillStyle = "rgb(0 0 0)";
  //canvasCtx.fillStyle = "rgba(0, 0, 0, .01)";
  canvasCtx.fillRect(0, 0, 360, 250);
  
  spectogramAnimationLoop = setInterval(() => {
    analyser.getFloatFrequencyData(dataSpectogramFreqArray);
    let currentY = 0;

    for (let i = bufferLength; i > 0; i--) {
      //let currentFreq = getFrequency(index);
      let yellowSpectrum = 255 + dataSpectogramFreqArray[i];
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
        clearInterval(spectogramAnimationLoop)
        break;
      }
    }
    currentX += frameLength;

    if (!playing) {
      clearInterval(spectogramAnimationLoop)
    }
  }, 20)

}