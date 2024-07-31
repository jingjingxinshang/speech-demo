import * as sdk from "microsoft-cognitiveservices-speech-sdk";

let audioConfig = null;

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
  const key = "your_subscription_key";
  const region = "your_service_region";
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = "zh-CN";

  // 根据是否提供deviceId来选择麦克风
  if (deviceId) {
    audioConfig = sdk.AudioConfig.fromMicrophoneInput(deviceId);
  } else if (!audioConfig) {
    audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
  }

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  recognizer.recognizing = (sender, event) => {
    options.onProcessing && options.onProcessing(event.result.text);
  };

  recognizer.recognized = (s, e) => {
    console.log(e);
    options.onStream && options.onStream(e);
  };

  recognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.reason}`);
    options.onCanceled && options.onCanceled(e);
  };

  recognizer.sessionStarted = (s, e) => {
    console.log("Session started event.");
    options.onSessionStarted && options.onSessionStarted(e);
  };

  recognizer.sessionStopped = (s, e) => {
    console.log("Session stopped event.");
    options.onSessionStopped && options.onSessionStopped(e);
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

  // 返回一个停止函数
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
