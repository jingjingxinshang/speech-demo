// speech-recognition.js
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const key = "key";
const region = "region";

export async function getMicrophoneList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter(
      (device) => device.kind === "audioinput"
    );
    return microphones.map((mic) => ({
      deviceId: mic.deviceId,
      label: mic.label || `麦克风 ${mic.deviceId}`,
    }));
  } catch (error) {
    console.error("获取麦克风列表失败:", error);
    return [];
  }
}

export function sttFromMicStream(options, deviceId = null) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = "zh-CN";

  let audioConfig;
  if (deviceId) {
    audioConfig = sdk.AudioConfig.fromMicrophoneInput(deviceId);
  } else {
    audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
  }

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizing = (s, e) => {
    options.onProcessing && options.onProcessing(e.result.text);
  };

  recognizer.recognized = (s, e) => {
    options.onStream && options.onStream(e);
  };

  recognizer.canceled = (s, e) => {
    options.onError && options.onError(e);
  };

  recognizer.sessionStarted = (s, e) => {
    options.onStart && options.onStart(e);
  };

  recognizer.sessionStopped = (s, e) => {
    options.onStop && options.onStop(e);
  };

  recognizer.startContinuousRecognitionAsync(
    () => {
      options.onStart && options.onStart();
    },
    (err) => {
      options.onError && options.onError(err);
    }
  );

  return (cb, err) => {
    recognizer.stopContinuousRecognitionAsync(
      () => {
        cb && cb();
        recognizer.close();
      },
      (error) => {
        err && err(error);
        recognizer.close();
      }
    );
  };
}

export function sttFromAudioFile(audioFile, options) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = "zh-CN";

  const audioConfig = sdk.AudioConfig.fromWavFileInput(audioFile);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizeOnceAsync(
    (result) => {
      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        options.onResult && options.onResult(result.text, result);
      } else {
        options.onError && options.onError("Speech not recognized.");
      }
      recognizer.close();
    },
    (error) => {
      options.onError && options.onError(error);
      recognizer.close();
    }
  );
}
