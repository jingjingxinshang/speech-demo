<template>
  <div>
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
  </div>
</template>

<script setup>
import { ref } from "vue";
import { sttFromMicStream } from "../speech-recognition";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const isRecognizing = ref(false);
const recognitionResult = ref("");
const recognitionDetails = ref([]);
let stopRecognitionFunc = null;

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
</script>
