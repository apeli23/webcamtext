### Extract webcam tecxt with Nextjs


## Introduction

This article demonstrates texts ccan e extractethrough webcam via nextjs and tesseract js library.
## Codesandbox

Check the sandbox demo on  [Codesandbox](/).

<CodeSandbox
title="webcamtext"
id=" "
/>

You can also get the project github repo using [Github](/).

## Prerequisites

Entry-level javascript and React/Nextjs knowledge.

## Setting Up the Sample Project

Create a new nextjs app using `npx create-next-app webcamtext` in your terminal.
Head to your project root directory `cd webcamtext`
 

We will begin by setting up our backend involving [Cloudinary](https://cloudinary.com/?ap=em) intergration.  

Create your own cloudinary account using this [link](https://cloudinary.com/console) and log into it. Cloudinary will provide you with a dashboard containing enviroment variable neccessary for the intergration to your project.

To intergrate, start by including cloudinary in your project dependancies `npm install cloudinary`
In your project root directory, create a new file named `.env` and paste the following code.

```
".env"


CLOUDINARY_CLOUD_NAME =

CLOUDINARY_API_KEY =

CLOUDINARY_API_SECRET =
```
 Fill the blanks with your environment variables from cloudinary dashboard and restart your project using: `npm run dev`.

In the `pages/api` folder, create a new file named `upload.js` and begin by configuring the environment keys and libraries.

```
var cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
```

Next js includes a handler function to execute the POST request. The function will receive media file data and post it to the cloudinary website. It then captures the media file's cloudinary link and sends it back as a response.

```
export default async function handler(req, res) {
    if (req.method === "POST") {
        let url = ""
        try {
            let fileStr = req.body.data;
            const uploadedResponse = await cloudinary.uploader.upload_large(
                fileStr,
                {
                    resource_type: "video",
                    chunk_size: 6000000,
                }
            );
            url = uploadedResponse.url
        } catch (error) {
            res.status(500).json({ error: "Something wrong" });
        }

        res.status(200).json({data: url});
    }
}
```

 

The code above concludes our backend. Let us now extract our texts.

Start by downloading `tesseract.js` in your dependancies: `npm install tesseract.js`

Create a directory `components/Main.client.js` and include tesseract.js in your imports

```
components/main.client.json

import Tesseract from "tesseract.js";
import { createWorker } from "tesseract.js";

import React, { useRef, useEffect, useState } from "react";
```
Notice the react state hooks included. We will use them as we move on.

Inside your `Main` function, start by declaring the following functions for your state hooks as well as filling in the return statement

```
export default function Main() {
  const processedVid = useRef();
  const rawVideo = useRef();
  const startBtn = useRef();
  const closeBtn = useRef();
  const snapBtn = useRef();
  const text_canvas = useRef();

  const [model, setModel] = useState(null);
  const [output, setOutput] = useState(null);

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

    return(
        <>
      {model && (
        <>
          <div className="card">
            <div className="videos">
              <video
                className="display"
                width={800}
                height={450}
                ref={rawVideo}
                autoPlay
                playsInline
              />
            </div>

            <canvas
              className="display"
              width={800}
              height={450}
              ref={processedVid}
            ></canvas>
          </div>

          {output && (
            <canvas width={800} height={450} ref={text_canvas}>
              {output}
            </canvas>
          )}

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
    )
}
```

The code above declares use state and use ref hooks constants that we use to link to the dom elements. In the DOM elements we will have a video element for our webcam and 2 canvas, one for viewing a screenshot of the captured frame we decode the text from and one for viewing the decoded texts. We also include a useRef hook to  allow us to load our models only when necessary.

Below the use effect, create a function below:
```
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
```

The code above will first request a user to activate their webcam and mic, and populate the video element with the webcam camera using a media recorder. Below it add the code below

```
const stopCamHandler = async () => {
    console.log("Hanging up the call ...");
    localStream.getTracks().forEach((track) => track.stop());

    localStream.getTracks().forEach(function (track) {
      track.stop();
    });
  };
```

The function above will stop the local media stream when the user is finished. Proceed with the following

```
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

    // uploadVideo(to_cloudinary);
    await stopCamHandler();
  };
 ```
In the code above, we refference a canvas using the useRef `processedVid` and draw in the image captured by the user using a draw image method. The image is then passed to tesseract where it is decoded, cleaned and assigned to the output variable using a use state hook. The function is async because it awaits the `stopCamHandler` function

At this point, we will then pass the decoded text to cloudinary through an image containing all the texts the webcam has decoded
 ```
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

```
THats it!. Ensure to go through the atrictle to enjoy the experience