<template>
  <div>
    <n-tabs type="line" animated>
      <n-tab-pane tab="默认 mic" name="defaultMic">
        <button @click="startRecognition" :disabled="isRecognizing">
          开始识别
        </button>
        <button @click="stopRecognition" :disabled="!isRecognizing">
          停止识别
        </button>
        <p>识别结果: {{ recognitionResult }}</p>
        <div>
          <h3>详细识别信息：</h3>
          <div v-for="(detail, index) in recognitionDetails" :key="index">
            <h4>识别事件 {{ index + 1 }}:</h4>
            <pre>{{ JSON.stringify(detail, null, 2) }}</pre>
          </div>
        </div>
      </n-tab-pane>
      <n-tab-pane name="selectMic" tab="选择 mic">
        <n-select
          v-model:value="selectedMic"
          :options="micList"
          style="margin-bottom: 20px"
        />
        <button @click="startRecognitionMic" :disabled="isRecognizingMic">
          开始识别
        </button>
        <button @click="stopRecognitionMic" :disabled="!isRecognizingMic">
          停止识别
        </button>
        <p>识别结果: {{ recognitionResultMic }}</p>
        <div>
          <h3>详细识别信息：</h3>
          <div v-for="(detail, index) in recognitionDetailsMic" :key="index">
            <h4>识别事件 {{ index + 1 }}:</h4>
            <pre>{{ JSON.stringify(detail, null, 2) }}</pre>
          </div>
        </div>
      </n-tab-pane>
      <n-tab-pane name="batchRecognition" tab="非实时识别">
        <button @click="startBatchRecognition" :disabled="isBatchRecognizing">
          开始录音
        </button>
        <button @click="stopBatchRecognition" :disabled="!isBatchRecognizing">
          停止录音并识别
        </button>
        <div v-if="audioUrl">
          <h3>录音播放：</h3>
          <audio controls :src="audioUrl"></audio>
        </div>
        <p>识别结果: {{ batchRecognitionResult }}</p>
        <div v-if="batchRecognitionDetails">
          <h3>详细识别信息：</h3>
          <pre>{{ JSON.stringify(batchRecognitionDetails, null, 2) }}</pre>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import {
  getMicrophoneList,
  sttFromMicStream,
  sttFromAudioFile,
} from "@/speech-recognition";
import { NTabs, NTabPane, NSelect } from "naive-ui";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const isRecognizing = ref(false);
const isRecognizingMic = ref(false);
const recognitionResult = ref("");
const recognitionResultMic = ref("");
const recognitionDetails = ref([]);
const recognitionDetailsMic = ref([]);
const micList = ref([]);
const selectedMic = ref(null);
let stopRecognitionFunc = null;
let stopRecognitionMicFunc = null;

const isBatchRecognizing = ref(false);
const batchRecognitionResult = ref("");
const batchRecognitionDetails = ref(null);
let mediaRecorder = null;
let audioChunks = [];
const audioUrl = ref(null);

const ffmpeg = ref(null);
const fetchFileFunc = ref(null);

onMounted(async () => {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");
  ffmpeg.value = new FFmpeg();
  fetchFileFunc.value = fetchFile;
});

const startRecognition = () => {
  isRecognizing.value = true;
  recognitionResult.value = "";
  recognitionDetails.value = [];

  stopRecognitionFunc = sttFromMicStream({
    onStart: () => {
      console.log("识别开始");
    },
    onProcessing: (text) => {
      recognitionResult.value = text;
    },
    onStream: (e) => {
      recognitionDetails.value.push(e);
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        recognitionResult.value += e.result.text + " ";
      }
    },
    onError: (error) => {
      console.error("识别错误:", error);
      isRecognizing.value = false;
    },
  });
};

const stopRecognition = () => {
  if (stopRecognitionFunc) {
    stopRecognitionFunc(
      () => {
        console.log("识别已停止");
        isRecognizing.value = false;
      },
      (error) => {
        console.error("停止识别时出错:", error);
        isRecognizing.value = false;
      }
    );
  }
};

const startRecognitionMic = () => {
  isRecognizingMic.value = true;
  recognitionResultMic.value = "";
  recognitionDetailsMic.value = [];

  stopRecognitionMicFunc = sttFromMicStream(
    {
      onStart: () => {
        console.log("选定麦克风识别开始");
      },
      onProcessing: (text) => {
        recognitionResultMic.value = text;
      },
      onStream: (e) => {
        recognitionDetailsMic.value.push(e);
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          recognitionResultMic.value += e.result.text + " ";
        }
      },
      onError: (error) => {
        console.error("选定麦克风识别错误:", error);
        isRecognizingMic.value = false;
      },
    },
    selectedMic.value
  );
};

const stopRecognitionMic = () => {
  if (stopRecognitionMicFunc) {
    stopRecognitionMicFunc(
      () => {
        console.log("选定麦克风识别已停止");
        isRecognizingMic.value = false;
      },
      (error) => {
        console.error("停止选定麦克风识别时出错:", error);
        isRecognizingMic.value = false;
      }
    );
  }
};

const startBatchRecognition = () => {
  isBatchRecognizing.value = true;
  batchRecognitionResult.value = "";
  batchRecognitionDetails.value = null;
  audioChunks = [];
  audioUrl.value = null;

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      mediaRecorder.start();
    })
    .catch((error) => {
      console.error("获取麦克风权限失败:", error);
      isBatchRecognizing.value = false;
    });
};

const stopBatchRecognition = async () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      audioUrl.value = URL.createObjectURL(audioBlob);

      try {
        if (!ffmpeg.value || !fetchFileFunc.value) {
          const { FFmpeg } = await import("@ffmpeg/ffmpeg");
          const { fetchFile } = await import("@ffmpeg/util");
          ffmpeg.value = new FFmpeg();
          fetchFileFunc.value = fetchFile;
        }
        await ffmpeg.value.load();
        ffmpeg.value.FS("writeFile", "input.webm", await fetchFile(audioBlob));
        await ffmpeg.value.run("-i", "input.webm", "output.wav");
        const data = ffmpeg.value.FS("readFile", "output.wav");
        const wavFile = new File([data.buffer], "speech.wav", {
          type: "audio/wav",
        });

        sttFromAudioFile(wavFile, {
          onResult: (result, details) => {
            batchRecognitionResult.value = result;
            batchRecognitionDetails.value = details;
            isBatchRecognizing.value = false;
          },
          onError: (error) => {
            console.error("批处理识别错误:", error);
            isBatchRecognizing.value = false;
          },
        });
      } catch (error) {
        console.error("音频转换错误:", error);
        isBatchRecognizing.value = false;
      }
    };
  }
};

const getMicList = async () => {
  try {
    const microphones = await getMicrophoneList();
    console.log("可用的麦克风:", microphones);
    micList.value = microphones.map((mic) => ({
      label: mic.label,
      value: mic.deviceId,
    }));
    if (micList.value.length > 0) {
      selectedMic.value = micList.value[0].value;
    }
  } catch (error) {
    console.error("获取麦克风列表时出错:", error);
  }
};

onMounted(() => {
  getMicList();
});

onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value);
  }
});
</script>
