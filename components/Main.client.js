import Tesseract from "tesseract.js";
import { createWorker } from "tesseract.js";

import React, { useRef, useEffect, useState } from "react";

const worker = createWorker({
  logger: (m) => console.log(m),
});

export default function Main() {
  const processedVid = useRef();
  const rawVideo = useRef();
  const startBtn = useRef();
  const closeBtn = useRef();
  const snapBtn = useRef();
  const text_canvas = useRef();

  const [model, setModel] = useState(null);
  const [output, setOutput] = useState(null);

  let recordedChunks = [];
  let options = { mimeType: "video/webm; codecs=vp9" };
  let c_out, mediaRecorder, localStream, video_in;

  useEffect(() => {
    // captureOutput();
    if (model) return;
    const start_time = Date.now() / 1000;
    worker.load().then((m) => {
      setModel(m);
      const end_time = Date.now() / 1000;
      console.log(`model loaded successfully, ${end_time - start_time}`);
    });
  }, []);

  const startCamHandler = async () => {
    console.log("Starting webcam and mic ..... ");
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    //populate video element
    rawVideo.current.srcObject = localStream;
    video_in = rawVideo.current;
    rawVideo.current.addEventListener("loadeddata", (ev) => {
      console.log("loaded data.");
    });

    mediaRecorder = new MediaRecorder(localStream, options);
    mediaRecorder.ondataavailable = (event) => {
      console.log("data-available");
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    mediaRecorder.start();
  };

  const stopCamHandler = async () => {
    console.log("Hanging up the call ...");
    localStream.getTracks().forEach((track) => track.stop());

    localStream.getTracks().forEach(function (track) {
      track.stop();
    });
  };

  const captureSnapshot = async () => {
    c_out = processedVid.current;

    c_out
      .getContext("2d")
      .drawImage(video_in, 0, 0, video_in.videoWidth, video_in.videoHeight);

    let img_url = c_out.toDataURL("image/png");

    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // pass the image data to tessaract
    const {
      data: { text },
    } = await worker.recognize(img_url);
    console.log(text, " retrieved text");

    setOutput(text.replace(/[^a-zA-Z ]/g, " "));

    uploadVideo(to_cloudinary);
    await stopCamHandler();
  };


  const uploadVideo = async (base64) => {
    console.log("uploading to backend...");
    try {
      fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ data: base64 }),
        headers: { "Content-Type": "application/json" },
      }).then((response) => {
        console.log("successfull session", response.status);
      });
    } catch (error) {
      console.error(error);
    }
  };

  function readFile(file) {
    console.log("readFile()=>", file);
    return new Promise(function (resolve, reject) {
      let fr = new FileReader();

      fr.onload = function () {
        resolve(fr.result);
      };

      fr.onerror = function () {
        reject(fr);
      };

      fr.readAsDataURL(file);
    });
  }
  return (
    <>
    <h1>Extract Webcam Texts</h1>
      {model && (
        <>
          <div className="container">
            <div className="row">
              <div className="column">
                <video
                  className="display"
                  width={800}
                  height={450}
                  ref={rawVideo}
                  autoPlay
                  playsInline
                ></video>
              </div>
              <div className="column">
                <canvas
                  className="display"
                  width={800}
                  height={450}
                  ref={processedVid}
                ></canvas>
              </div>
              {output && (
              <div className="column">
                  <canvas width={800} height={450} ref={text_canvas}>
                    {output}
                  </canvas>
              </div>
                )}
            </div>
          </div>

          <div className="buttons">
            <button className="button" onClick={startCamHandler} ref={startBtn}>
              Start Webcam
            </button>
            <button className="button" onClick={stopCamHandler} ref={closeBtn}>
              Close camera
            </button>

            <button className="button" onClick={captureSnapshot} ref={snapBtn}>
              Capture snapshot and save
            </button>
          </div>
        </>
      )}
      {!model && <div>Loading machine learning models...</div>}
    </>
  );
}
