import * as sdk from "microsoft-cognitiveservices-speech-sdk";

let audioConfig = null;

export function sttFromMicStream(options) {
  const key = "key";
  const region = "region";
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = "zh-CN";

  if (!audioConfig) audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizing = (sender, event) => {
    options.onProcessing && options.onProcessing(event.result.text);
  };

  recognizer.recognized = (s, e) => {
    console.log(e);
    options.onStream && options.onStream(e);
  };

  recognizer.startContinuousRecognitionAsync(
    () => {
      options.onStart && options.onStart();
    },
    (err) => {
      console.log("recError", err);
      options.onError && options.onError(err);
    }
  );

  return (cb, err) => {
    recognizer.stopContinuousRecognitionAsync(cb, err);
  };
}
